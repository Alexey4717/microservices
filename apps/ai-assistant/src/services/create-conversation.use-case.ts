import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type {
  ConversationResponse,
  CreateConversationRequest,
} from '@libs/proto';

import { toConversationResponse } from '../helpers/conversation-mappers';
import { PrismaService } from './prisma.service';

@Injectable()
export class CreateConversationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _data: CreateConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationResponse> {
    const userId = requireUserId(metadata);
    const conversation = await this.prisma.conversation.create({
      data: { userId },
    });
    return toConversationResponse(conversation);
  }
}
