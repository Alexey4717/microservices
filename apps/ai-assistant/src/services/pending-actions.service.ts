import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import {
  type PendingAction,
  PendingActionStatus,
} from '@prisma/ai-assistant-client';

import { requireUserId } from '@libs/common';
import type {
  ActionResult,
  ConfirmActionRequest,
  RejectActionRequest,
} from '@libs/proto';

import { PaymentsGrpcService } from './payments-grpc.service';
import { PrismaService } from './prisma.service';
import {
  parseProposeCheckout,
  parseProposeNavigation,
  parseProposeUpdateName,
} from './propose-actions';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class PendingActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsGrpcService,
    private readonly users: UsersGrpcService,
    private readonly config: ConfigService,
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
      return await this.runEffect(action, effect, userId);
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
    return result(action.id, action.type, 'rejected');
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
