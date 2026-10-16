import { Injectable } from '@nestjs/common';

import { status } from '@grpc/grpc-js';
import { PendingActionStatus } from '@prisma/ai-assistant-client';

import { type ConversationWithMessages } from '../helpers/conversation-mappers';
import { rpcError } from '../helpers/rpc-errors';
import { PrismaService } from './prisma.service';

@Injectable()
export class ConversationAccessHelper {
  constructor(private readonly prisma: PrismaService) {}

  async loadOwned(
    id: string,
    userId: string,
  ): Promise<ConversationWithMessages> {
    const conversationId = id?.trim();
    if (!conversationId) {
      throw rpcError(status.INVALID_ARGUMENT, 'Не указан диалог');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        pendingActions: {
          where: { status: PendingActionStatus.pending },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conversation) {
      throw rpcError(status.NOT_FOUND, 'Диалог не найден');
    }
    return conversation;
  }
}
