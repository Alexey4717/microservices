import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type {
  ConversationResponse,
  DeleteConversationRequest,
} from '@libs/proto';

import { toConversationResponse } from '../helpers/conversation-mappers';
import { ConversationAccessHelper } from './conversation-access.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class DeleteConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationAccess: ConversationAccessHelper,
  ) {}

  async execute(
    data: DeleteConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationResponse> {
    const userId = requireUserId(metadata);
    const conversation = await this.conversationAccess.loadOwned(
      data.id,
      userId,
    );
    await this.prisma.conversation.delete({ where: { id: conversation.id } });
    return toConversationResponse(conversation);
  }
}
