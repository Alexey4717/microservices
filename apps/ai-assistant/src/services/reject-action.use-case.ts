import { Injectable } from '@nestjs/common';

import { Metadata, status } from '@grpc/grpc-js';
import { PendingActionStatus } from '@prisma/ai-assistant-client';

import { requireUserId } from '@libs/common';
import type { ActionResult, RejectActionRequest } from '@libs/proto';

import { rpcError } from '../helpers/rpc-errors';
import { PendingActionsHelper } from './pending-actions.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class RejectActionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pendingActions: PendingActionsHelper,
  ) {}

  async execute(
    data: RejectActionRequest,
    metadata: Metadata,
  ): Promise<ActionResult> {
    const userId = requireUserId(metadata);
    const action = await this.pendingActions.loadPending(data.actionId, userId);
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
    const outcome = this.pendingActions.result(
      action.id,
      action.type,
      'rejected',
    );
    await this.pendingActions.resumeAfterDecision(action, userId, {
      decision: 'rejected',
    });
    return outcome;
  }
}
