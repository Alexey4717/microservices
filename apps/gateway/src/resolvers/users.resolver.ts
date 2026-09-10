import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../decorators/current-user.decorator';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
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
}
