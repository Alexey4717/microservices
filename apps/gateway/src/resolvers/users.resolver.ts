import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';

import { type FileUpload, GraphQLUpload } from 'graphql-upload-ts';

import { CurrentUser } from '../decorators/current-user.decorator';
import { UpdateMeInput } from '../dto/update-me.input';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { readGraphqlUpload } from '../helpers/read-graphql-upload';
import { isOwnTelegramLinkedEvent } from '../helpers/telegram-linked-filter';
import { toUserModel } from '../mappers/auth.mapper';
import { TelegramLink } from '../models/telegram-link.model';
import { TelegramLinkedPayload } from '../models/telegram-linked.model';
import { UserModel } from '../models/user.model';
import { CreateTelegramLinkUseCase } from '../services/create-telegram-link.use-case';
import { GetMeUseCase } from '../services/get-me.use-case';
import {
  type TelegramLinkedEvent,
  TelegramLinkedService,
} from '../services/telegram-linked.service';
import { UpdateMeUseCase } from '../services/update-me.use-case';
import { UploadAvatarUseCase } from '../services/upload-avatar.use-case';
import type { AuthenticatedUser } from '../types/auth.types';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly createTelegramLinkUseCase: CreateTelegramLinkUseCase,
    private readonly telegramLinkedService: TelegramLinkedService,
  ) {}

  @Query(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserModel> {
    const profile = await this.getMeUseCase.execute(user.userId);
    return toUserModel(profile);
  }

  @Mutation(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async updateMe(
    @Args('input') input: UpdateMeInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserModel> {
    const profile = await this.updateMeUseCase.execute(user.userId, input);
    return toUserModel(profile);
  }

  @Mutation(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async uploadAvatar(
    @Args({ name: 'file', type: () => GraphQLUpload })
    file: Promise<FileUpload> | FileUpload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserModel> {
    const uploaded = await readGraphqlUpload(file);
    const profile = await this.uploadAvatarUseCase.execute(
      user.userId,
      uploaded,
    );
    return toUserModel(profile);
  }

  @Mutation(() => TelegramLink)
  @UseGuards(GqlAuthGuard)
  createTelegramLink(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TelegramLink> {
    return this.createTelegramLinkUseCase.execute(user.userId);
  }

  @Subscription(() => TelegramLinkedPayload, {
    filter: isOwnTelegramLinkedEvent,
    resolve: (payload: TelegramLinkedEvent) => payload.telegramLinked,
  })
  @UseGuards(GqlAuthGuard)
  telegramLinked(
    @CurrentUser() _user: AuthenticatedUser,
  ): AsyncIterableIterator<TelegramLinkedEvent> {
    return this.telegramLinkedService.asyncIterator();
  }
}
