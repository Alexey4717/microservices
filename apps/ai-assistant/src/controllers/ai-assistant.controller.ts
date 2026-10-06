import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

import { AI_ASSISTANT_SERVICE_NAME } from '@libs/proto';
import type {
  ConversationDetailResponse,
  ConversationResponse,
  CreateConversationRequest,
  GetConversationRequest,
  ListConversationsRequest,
  ListConversationsResponse,
  SendMessageEvent,
  SendMessageRequest,
} from '@libs/proto';

import { ConversationsService } from '../services/conversations.service';

@Controller()
export class AiAssistantController {
  constructor(private readonly conversations: ConversationsService) {}

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'CreateConversation')
  createConversation(
    data: CreateConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationResponse> {
    return this.conversations.createConversation(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'ListConversations')
  listConversations(
    data: ListConversationsRequest,
    metadata: Metadata,
  ): Promise<ListConversationsResponse> {
    return this.conversations.listConversations(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'GetConversation')
  getConversation(
    data: GetConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationDetailResponse> {
    return this.conversations.getConversation(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'SendMessage')
  sendMessage(
    data: SendMessageRequest,
    metadata: Metadata,
  ): Observable<SendMessageEvent> {
    return this.conversations.sendMessage(data, metadata);
  }
}
