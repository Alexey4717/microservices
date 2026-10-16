import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type {
  ConversationDetailResponse,
  GetConversationRequest,
} from '@libs/proto';

import { toDetail } from '../helpers/conversation-mappers';
import { ConversationAccessHelper } from './conversation-access.helper';

@Injectable()
export class GetConversationUseCase {
  constructor(private readonly conversationAccess: ConversationAccessHelper) {}

  async execute(
    data: GetConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationDetailResponse> {
    const userId = requireUserId(metadata);
    const conversation = await this.conversationAccess.loadOwned(
      data.id,
      userId,
    );
    return toDetail(conversation);
  }
}
