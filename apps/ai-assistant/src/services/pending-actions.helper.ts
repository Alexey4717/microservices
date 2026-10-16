import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { status } from '@grpc/grpc-js';
import {
  MessageRole,
  type PendingAction,
  PendingActionStatus,
} from '@prisma/ai-assistant-client';

import type { ActionResult } from '@libs/proto';

import { rpcError } from '../helpers/rpc-errors';
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

type PendingEffect =
  | { type: 'checkout'; provider: 'STRIPE' | 'PAYPAL'; productCode: string }
  | { type: 'navigate'; path: string }
  | { type: 'update_name'; name: string };

@Injectable()
export class PendingActionsHelper {
  private readonly logger = new Logger(PendingActionsHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsGrpcService,
    private readonly users: UsersGrpcService,
    private readonly config: ConfigService,
    private readonly agentGraph: AgentGraphService,
  ) {}

  async loadPending(
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

  effectFromPayload(action: PendingAction): PendingEffect {
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

  result(
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

  async runEffect(
    action: PendingAction,
    effect: PendingEffect,
    userId: string,
  ): Promise<ActionResult> {
    if (effect.type === 'navigate') {
      return this.result(action.id, action.type, 'confirmed', {
        path: effect.path,
      });
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
      return this.result(action.id, action.type, 'confirmed', {
        checkoutUrl: checkout.checkoutUrl,
      });
    }

    await this.users.updateMe(userId, internalToken, effect.name);
    return this.result(action.id, action.type, 'confirmed');
  }

  async resumeAfterDecision(
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
}
