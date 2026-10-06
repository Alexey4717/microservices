import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';

import { CurrentUser } from '../decorators/current-user.decorator';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import {
  toAiConversationDetailModel,
  toAiConversationModel,
} from '../mappers/ai-assistant.mapper';
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

  @Subscription(() => AiAssistantReplyModel, {
    resolve: (payload: AiAssistantReplyModel) => payload,
  })
  @UseGuards(GqlAuthGuard)
  aiAssistantReply(
    @Args('conversationId', { type: () => ID }) conversationId: string,
    @Args('content') content: string,
    @CurrentUser() user: AuthenticatedUser,
  ): AsyncIterable<AiAssistantReplyModel> {
    return this.aiAssistantGrpc.sendMessage(
      conversationId,
      content,
      this.internalToken(),
      user.userId,
    );
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}
