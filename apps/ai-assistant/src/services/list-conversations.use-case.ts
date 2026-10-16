import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type {
  ListConversationsRequest,
  ListConversationsResponse,
} from '@libs/proto';

import { toConversationResponse } from '../helpers/conversation-mappers';
import { PrismaService } from './prisma.service';

@Injectable()
export class ListConversationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _data: ListConversationsRequest,
    metadata: Metadata,
  ): Promise<ListConversationsResponse> {
    const userId = requireUserId(metadata);
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return { conversations: conversations.map(toConversationResponse) };
  }
}
