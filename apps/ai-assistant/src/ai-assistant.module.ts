import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { InternalTokenInterceptor, validateAiAssistantEnv } from '@libs/common';

import { AiAssistantController } from './controllers/ai-assistant.controller';
import { HealthController } from './controllers/health.controller';
import { DomainGrpcModule } from './grpc/domain-grpc.module';
import { ConversationsService } from './services/conversations.service';
import { LlmService } from './services/llm.service';
import { PaymentsTool } from './services/payments-tool';
import { PrismaService } from './services/prisma.service';
import { ProfileTool } from './services/profile-tool';
import { EmptyRetrieval, RetrievalPort } from './services/retrieval.port';
import { TokenBudgetService } from './services/token-budget.service';
import { ToolRegistry } from './services/tool-registry';

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
    ToolRegistry,
    ConversationsService,
    {
      provide: RetrievalPort,
      useClass: EmptyRetrieval,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalTokenInterceptor,
    },
  ],
})
export class AiAssistantModule {}
