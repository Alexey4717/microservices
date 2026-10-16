import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

import { AI_ASSISTANT_SERVICE_NAME } from '@libs/proto';
import type {
  ActionResult,
  ConfirmActionRequest,
  ConversationDetailResponse,
  ConversationResponse,
  CreateConversationRequest,
  DeleteConversationRequest,
  GetConversationRequest,
  ListConversationsRequest,
  ListConversationsResponse,
  RejectActionRequest,
  SendMessageEvent,
  SendMessageRequest,
} from '@libs/proto';

import { ConfirmActionUseCase } from '../services/confirm-action.use-case';
import { CreateConversationUseCase } from '../services/create-conversation.use-case';
import { DeleteConversationUseCase } from '../services/delete-conversation.use-case';
import { GetConversationUseCase } from '../services/get-conversation.use-case';
import { ListConversationsUseCase } from '../services/list-conversations.use-case';
import { RejectActionUseCase } from '../services/reject-action.use-case';
import { SendMessageUseCase } from '../services/send-message.use-case';

@Controller()
export class AiAssistantController {
  constructor(
    private readonly createConversationUseCase: CreateConversationUseCase,
    private readonly deleteConversationUseCase: DeleteConversationUseCase,
    private readonly listConversationsUseCase: ListConversationsUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly confirmActionUseCase: ConfirmActionUseCase,
    private readonly rejectActionUseCase: RejectActionUseCase,
  ) {}

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'CreateConversation')
  createConversation(
    data: CreateConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationResponse> {
    return this.createConversationUseCase.execute(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'DeleteConversation')
  deleteConversation(
    data: DeleteConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationResponse> {
    return this.deleteConversationUseCase.execute(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'ListConversations')
  listConversations(
    data: ListConversationsRequest,
    metadata: Metadata,
  ): Promise<ListConversationsResponse> {
    return this.listConversationsUseCase.execute(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'GetConversation')
  getConversation(
    data: GetConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationDetailResponse> {
    return this.getConversationUseCase.execute(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'SendMessage')
  sendMessage(
    data: SendMessageRequest,
    metadata: Metadata,
  ): Observable<SendMessageEvent> {
    return this.sendMessageUseCase.execute(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'ConfirmAction')
  confirmAction(
    data: ConfirmActionRequest,
    metadata: Metadata,
  ): Promise<ActionResult> {
    return this.confirmActionUseCase.execute(data, metadata);
  }

  @GrpcMethod(AI_ASSISTANT_SERVICE_NAME, 'RejectAction')
  rejectAction(
    data: RejectActionRequest,
    metadata: Metadata,
  ): Promise<ActionResult> {
    return this.rejectActionUseCase.execute(data, metadata);
  }
}
