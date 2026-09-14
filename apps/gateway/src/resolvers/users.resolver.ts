import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { type FileUpload, GraphQLUpload } from 'graphql-upload-ts';

import { CurrentUser } from '../decorators/current-user.decorator';
import { UpdateMeInput } from '../dto/update-me.input';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { readGraphqlUpload } from '../helpers/read-graphql-upload';
import { toUserModel } from '../mappers/auth.mapper';
import { UserModel } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import type { AuthenticatedUser } from '../types/auth.types';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly authService: AuthService) {}

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
}
