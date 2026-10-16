import { Injectable } from '@nestjs/common';

import { Metadata, status } from '@grpc/grpc-js';
import { PendingActionStatus } from '@prisma/ai-assistant-client';

import { requireUserId } from '@libs/common';
import type { ActionResult, ConfirmActionRequest } from '@libs/proto';

import { rpcError } from '../helpers/rpc-errors';
import { PendingActionsHelper } from './pending-actions.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class ConfirmActionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pendingActions: PendingActionsHelper,
  ) {}

  async execute(
    data: ConfirmActionRequest,
    metadata: Metadata,
  ): Promise<ActionResult> {
    const userId = requireUserId(metadata);
    const action = await this.pendingActions.loadPending(data.actionId, userId);
    const effect = this.pendingActions.effectFromPayload(action);
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
      const outcome = await this.pendingActions.runEffect(
        action,
        effect,
        userId,
      );
      await this.pendingActions.resumeAfterDecision(action, userId, {
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
}
