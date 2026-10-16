import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { InternalTokenInterceptor, validateAiAssistantEnv } from '@libs/common';

import { AiAssistantController } from './controllers/ai-assistant.controller';
import { HealthController } from './controllers/health.controller';
import { DomainGrpcModule } from './grpc/domain-grpc.module';
import { AgentGraphService } from './services/agent-graph.service';
import { ConfirmActionUseCase } from './services/confirm-action.use-case';
import { ConversationAccessHelper } from './services/conversation-access.helper';
import { CreateConversationUseCase } from './services/create-conversation.use-case';
import { DeleteConversationUseCase } from './services/delete-conversation.use-case';
import { GetConversationUseCase } from './services/get-conversation.use-case';
import { ListConversationsUseCase } from './services/list-conversations.use-case';
import { LlmService } from './services/llm.service';
import { PaymentsTool } from './services/payments-tool';
import { PendingActionsHelper } from './services/pending-actions.helper';
import { PrismaService } from './services/prisma.service';
import { ProfileTool } from './services/profile-tool';
import {
  ProposeCheckoutTool,
  ProposeNavigationTool,
  ProposeUpdateNameTool,
} from './services/propose-tools';
import { RejectActionUseCase } from './services/reject-action.use-case';
import { RetrievalPort } from './services/retrieval.port';
import { SendMessageUseCase } from './services/send-message.use-case';
import { TokenBudgetService } from './services/token-budget.service';
import { ToolRegistry } from './services/tool-registry';
import { VectorRetrieval } from './services/vector-retrieval';
import { GetVideoTool, ListVideosTool } from './services/video-tool';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateAiAssistantEnv,
    }),
    DomainGrpcModule,
  ],
  controllers: [HealthController, AiAssistantController],
  providers: [
    PrismaService,
    LlmService,
    TokenBudgetService,
    ProfileTool,
    PaymentsTool,
    GetVideoTool,
    ListVideosTool,
    ProposeCheckoutTool,
    ProposeNavigationTool,
    ProposeUpdateNameTool,
    ToolRegistry,
    AgentGraphService,
    ConversationAccessHelper,
    PendingActionsHelper,
    CreateConversationUseCase,
    DeleteConversationUseCase,
    ListConversationsUseCase,
    GetConversationUseCase,
    SendMessageUseCase,
    ConfirmActionUseCase,
    RejectActionUseCase,
    {
      provide: RetrievalPort,
      useClass: VectorRetrieval,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalTokenInterceptor,
    },
  ],
})
export class AiAssistantModule {}
