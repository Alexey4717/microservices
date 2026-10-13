import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import {
  MessageRole,
  type PendingAction,
  PendingActionStatus,
} from '@prisma/ai-assistant-client';

import { requireUserId } from '@libs/common';
import type {
  ActionResult,
  ConfirmActionRequest,
  RejectActionRequest,
} from '@libs/proto';

import { AgentGraphService } from './agent-graph.service';
import type { ResumeDecision } from './agent-state';
import { PaymentsGrpcService } from './payments-grpc.service';
import { PrismaService } from './prisma.service';
import {
  parseProposeCheckout,
  parseProposeNavigation,
  parseProposeUpdateName,
} from './propose-actions';
import { utcDay } from './token-budget.service';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class PendingActionsService {
  private readonly logger = new Logger(PendingActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsGrpcService,
    private readonly users: UsersGrpcService,
    private readonly config: ConfigService,
    private readonly agentGraph: AgentGraphService,
  ) {}

  async confirm(
    data: ConfirmActionRequest,
    metadata: Metadata,
  ): Promise<ActionResult> {
    const userId = requireUserId(metadata);
    const action = await this.loadPending(data.actionId, userId);
    const effect = effectFromPayload(action);
    const claimed = await this.prisma.pendingAction.updateMany({
      where: {
        id: action.id,
        userId,
        status: PendingActionStatus.pending,
      },
      data: { status: PendingActionStatus.confirmed },
    });
    if (claimed.count !== 1) {
      throw rpcError(status.NOT_FOUND, 'Действие не найдено');
    }

    try {
      const outcome = await this.runEffect(action, effect, userId);
      await this.resumeAfterDecision(action, userId, {
        decision: 'confirmed',
        checkoutUrl: outcome.checkoutUrl || undefined,
        path: outcome.path || undefined,
      });
      return outcome;
    } catch (error) {
      await this.prisma.pendingAction
        .updateMany({
          where: {
            id: action.id,
            userId,
            status: PendingActionStatus.confirmed,
          },
          data: { status: PendingActionStatus.pending },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  async reject(
    data: RejectActionRequest,
    metadata: Metadata,
  ): Promise<ActionResult> {
    const userId = requireUserId(metadata);
    const action = await this.loadPending(data.actionId, userId);
    const updated = await this.prisma.pendingAction.updateMany({
      where: {
        id: action.id,
        userId,
        status: PendingActionStatus.pending,
      },
      data: { status: PendingActionStatus.rejected },
    });
    if (updated.count !== 1) {
      throw rpcError(status.NOT_FOUND, 'Действие не найдено');
    }
    const outcome = result(action.id, action.type, 'rejected');
    await this.resumeAfterDecision(action, userId, { decision: 'rejected' });
    return outcome;
  }

  private async resumeAfterDecision(
    action: PendingAction,
    userId: string,
    decision: ResumeDecision,
  ): Promise<void> {
    const threadId = action.threadId?.trim();
    if (!threadId) {
      return;
    }

    try {
      const resumed = await this.agentGraph.resumeTurn(threadId, decision, {
        userId,
        conversationId: action.conversationId,
        internalToken: this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN'),
        threadId,
      });
      if (!resumed || resumed.interrupted || !resumed.content.trim()) {
        return;
      }

      await this.prisma.message.create({
        data: {
          id: resumed.assistantMessageId,
          conversationId: action.conversationId,
          role: MessageRole.assistant,
          content: resumed.content,
          promptTokens: resumed.promptTokens,
          completionTokens: resumed.completionTokens,
        },
      });
      await this.addUsage(
        userId,
        resumed.promptTokens,
        resumed.completionTokens,
      );
      await this.storeTrace({
        conversationId: action.conversationId,
        messageId: resumed.assistantMessageId,
        toolNames: resumed.toolNames,
        chunkIds: resumed.chunkIds,
        pagePath: resumed.pagePath,
        temperature: resumed.temperature,
      });
    } catch (error) {
      this.logger.warn(
        `Resume после ${decision.decision} не удался: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private async storeTrace(input: {
    conversationId: string;
    messageId: string;
    toolNames: string[];
    chunkIds: string[];
    pagePath: string | null;
    temperature: number;
  }): Promise<void> {
    try {
      await this.prisma.turnTrace.create({
        data: {
          conversationId: input.conversationId,
          messageId: input.messageId,
          toolNames: input.toolNames,
          chunkIds: input.chunkIds,
          pagePath: input.pagePath,
          temperature: input.temperature,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Траектория хода не сохранена: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private async addUsage(
    userId: string,
    promptTokens: number,
    completionTokens: number,
  ): Promise<void> {
    if (promptTokens <= 0 && completionTokens <= 0) {
      return;
    }
    const day = utcDay();
    await this.prisma.tokenUsage.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, promptTokens, completionTokens },
      update: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
      },
    });
  }

  private async loadPending(
    actionId: string | undefined,
    userId: string,
  ): Promise<PendingAction> {
    const id = actionId?.trim() ?? '';
    if (!id) {
      throw rpcError(status.INVALID_ARGUMENT, 'Не указано действие');
    }
    const action = await this.prisma.pendingAction.findFirst({
      where: { id, userId, status: PendingActionStatus.pending },
    });
    if (!action) {
      throw rpcError(status.NOT_FOUND, 'Действие не найдено');
    }
    return action;
  }

  private async runEffect(
    action: PendingAction,
    effect: PendingEffect,
    userId: string,
  ): Promise<ActionResult> {
    if (effect.type === 'navigate') {
      return result(action.id, action.type, 'confirmed', { path: effect.path });
    }

    const internalToken = this.config.getOrThrow<string>(
      'INTERNAL_SERVICE_TOKEN',
    );
    if (effect.type === 'checkout') {
      const checkout = await this.payments.createCheckout(
        userId,
        internalToken,
        effect.provider,
        effect.productCode,
      );
      return result(action.id, action.type, 'confirmed', {
        checkoutUrl: checkout.checkoutUrl,
      });
    }

    await this.users.updateMe(userId, internalToken, effect.name);
    return result(action.id, action.type, 'confirmed');
  }
}

type PendingEffect =
  | { type: 'checkout'; provider: 'STRIPE' | 'PAYPAL'; productCode: string }
  | { type: 'navigate'; path: string }
  | { type: 'update_name'; name: string };

function effectFromPayload(action: PendingAction): PendingEffect {
  if (action.type === 'checkout') {
    const parsed = parseProposeCheckout(action.payload);
    if (!parsed.ok) {
      throw rpcError(status.INVALID_ARGUMENT, parsed.error);
    }
    return {
      type: 'checkout',
      provider: parsed.provider,
      productCode: parsed.productCode,
    };
  }
  if (action.type === 'navigate') {
    const parsed = parseProposeNavigation(action.payload);
    if (!parsed.ok) {
      throw rpcError(status.INVALID_ARGUMENT, parsed.error);
    }
    return { type: 'navigate', path: parsed.path };
  }
  const parsed = parseProposeUpdateName(action.payload);
  if (!parsed.ok) {
    throw rpcError(status.INVALID_ARGUMENT, parsed.error);
  }
  return { type: 'update_name', name: parsed.name };
}

function result(
  actionId: string,
  type: string,
  actionStatus: string,
  extra?: { checkoutUrl?: string; path?: string },
): ActionResult {
  return {
    actionId,
    type,
    status: actionStatus,
    checkoutUrl: extra?.checkoutUrl ?? '',
    path: extra?.path ?? '',
  };
}

function rpcError(code: status, message: string): RpcException {
  return new RpcException({ code, message });
}
