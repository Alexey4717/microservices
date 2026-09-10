import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { LoginInput } from '../dto/login.input';
import { LogoutInput } from '../dto/logout.input';
import { RefreshInput } from '../dto/refresh.input';
import { RegisterInput } from '../dto/register.input';
import { toAuthPayload } from '../mappers/auth.mapper';
import { AuthPayload } from '../models/auth-payload.model';
import { AuthService } from '../services/auth.service';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(@Args('input') input: RegisterInput): Promise<AuthPayload> {
    const result = await this.authService.register(input);
    return toAuthPayload(result);
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    const result = await this.authService.login(input);
    return toAuthPayload(result);
  }

  @Mutation(() => AuthPayload)
  async refresh(@Args('input') input: RefreshInput): Promise<AuthPayload> {
    const result = await this.authService.refresh(input.refreshToken);
    return toAuthPayload(result);
  }

  @Mutation(() => Boolean)
  logout(@Args('input') input: LogoutInput): Promise<boolean> {
    return this.authService.logout(input.refreshToken);
  }
}
