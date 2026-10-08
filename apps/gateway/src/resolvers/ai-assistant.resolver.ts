import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  Float,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';

import { CurrentUser } from '../decorators/current-user.decorator';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import {
  mapAssistantEvents,
  toAiActionResult,
  toAiConversationDetailModel,
  toAiConversationModel,
} from '../mappers/ai-assistant.mapper';
import { AiActionResultModel } from '../models/ai-action.model';
import { AiAssistantReplyModel } from '../models/ai-assistant-reply.model';
import {
  AiConversationDetailModel,
  AiConversationModel,
} from '../models/ai-conversation.model';
import { AiAssistantGrpcService } from '../services/ai-assistant-grpc.service';
import type { AuthenticatedUser } from '../types/auth.types';

@Resolver()
export class AiAssistantResolver {
  constructor(
    private readonly aiAssistantGrpc: AiAssistantGrpcService,
    private readonly configService: ConfigService,
  ) {}

  @Query(() => [AiConversationModel])
  @UseGuards(GqlAuthGuard)
  async aiConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiConversationModel[]> {
    const result = await this.aiAssistantGrpc.listConversations(
      this.internalToken(),
      user.userId,
    );
    return (result.conversations ?? []).map(toAiConversationModel);
  }

  @Query(() => AiConversationDetailModel)
  @UseGuards(GqlAuthGuard)
  async aiConversation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiConversationDetailModel> {
    const result = await this.aiAssistantGrpc.getConversation(
      id,
      this.internalToken(),
      user.userId,
    );
    return toAiConversationDetailModel(result);
  }

  @Mutation(() => AiConversationModel)
  @UseGuards(GqlAuthGuard)
  async createAiConversation(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiConversationModel> {
    const result = await this.aiAssistantGrpc.createConversation(
      this.internalToken(),
      user.userId,
    );
    return toAiConversationModel(result);
  }

  @Mutation(() => AiActionResultModel)
  @UseGuards(GqlAuthGuard)
  async confirmAiAction(
    @Args('actionId', { type: () => ID }) actionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiActionResultModel> {
    const result = await this.aiAssistantGrpc.confirmAction(
      actionId,
      this.internalToken(),
      user.userId,
    );
    return toAiActionResult(result);
  }

  @Mutation(() => AiActionResultModel)
  @UseGuards(GqlAuthGuard)
  async rejectAiAction(
    @Args('actionId', { type: () => ID }) actionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiActionResultModel> {
    const result = await this.aiAssistantGrpc.rejectAction(
      actionId,
      this.internalToken(),
      user.userId,
    );
    return toAiActionResult(result);
  }

  @Subscription(() => AiAssistantReplyModel, {
    resolve: (payload: AiAssistantReplyModel) => payload,
  })
  @UseGuards(GqlAuthGuard)
  aiAssistantReply(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @Args('content') content: string,
    @CurrentUser() user: AuthenticatedUser,
    @Args('pagePath', { type: () => String, nullable: true })
    pagePath?: string | null,
    @Args('temperature', { type: () => Float, nullable: true })
    temperature?: number | null,
  ): AsyncIterable<AiAssistantReplyModel> {
    return mapAssistantEvents(
      this.aiAssistantGrpc.sendMessage(
        conversationId,
        content,
        this.internalToken(),
        user.userId,
        pagePath,
        temperature,
      ),
    );
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}
