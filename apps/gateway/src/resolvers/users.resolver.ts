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
import { AuthService } from '../services/auth.service';
import {
  type TelegramLinkedEvent,
  TelegramLinkedService,
} from '../services/telegram-linked.service';
import type { AuthenticatedUser } from '../types/auth.types';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly telegramLinkedService: TelegramLinkedService,
  ) {}

  @Query(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserModel> {
    const profile = await this.authService.me(user.userId);
    return toUserModel(profile);
  }

  @Mutation(() => UserModel)
  @UseGuards(GqlAuthGuard)
  async updateMe(
    @Args('input') input: UpdateMeInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserModel> {
    const profile = await this.authService.updateMe(user.userId, input);
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
    const profile = await this.authService.uploadAvatar(user.userId, uploaded);
    return toUserModel(profile);
  }

  @Mutation(() => TelegramLink)
  @UseGuards(GqlAuthGuard)
  createTelegramLink(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TelegramLink> {
    return this.authService.createTelegramLink(user.userId);
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
