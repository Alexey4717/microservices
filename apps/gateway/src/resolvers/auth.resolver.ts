import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';

import { LoginInput } from '../dto/login.input';
import { LogoutInput } from '../dto/logout.input';
import { RefreshInput } from '../dto/refresh.input';
import { RegisterInput } from '../dto/register.input';
import { parseTtlToMs } from '../helpers/parse-ttl-to-ms';
import {
  clearRefreshTokenCookie,
  resolveRefreshToken,
  setRefreshTokenCookie,
} from '../helpers/refresh-cookie';
import { toAuthPayload } from '../mappers/auth.mapper';
import { AuthPayload } from '../models/auth-payload.model';
import { AuthService } from '../services/auth.service';
import type { GqlContext } from '../types/gql-context';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => AuthPayload)
  async register(
    @Args('input') input: RegisterInput,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const result = await this.authService.register(input);
    this.writeRefreshCookie(context, result.refreshToken);
    return toAuthPayload(result);
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const result = await this.authService.login(input);
    this.writeRefreshCookie(context, result.refreshToken);
    return toAuthPayload(result);
  }

  @Mutation(() => AuthPayload)
  async loginWithTelegram(
    @Args('initData', { type: () => String }) initData: string,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const result = await this.authService.loginWithTelegram(initData);
    this.writeRefreshCookie(context, result.refreshToken);
    return toAuthPayload(result);
  }

  @Mutation(() => AuthPayload)
  async refresh(
    @Args('input', { type: () => RefreshInput, nullable: true })
    input: RefreshInput | undefined,
    @Context() context: GqlContext,
  ): Promise<AuthPayload> {
    const refreshToken = this.requireRefreshToken(context, input?.refreshToken);
    const result = await this.authService.refresh(refreshToken);
    this.writeRefreshCookie(context, result.refreshToken);
    return toAuthPayload(result);
  }

  @Mutation(() => Boolean)
  async logout(
    @Args('input', { type: () => LogoutInput, nullable: true })
    input: LogoutInput | undefined,
    @Context() context: GqlContext,
  ): Promise<boolean> {
    const refreshToken = this.requireRefreshToken(context, input?.refreshToken);
    await this.authService.logout(refreshToken);
    clearRefreshTokenCookie(context.res, this.isSecureCookie());
    return true;
  }

  private requireRefreshToken(
    context: GqlContext,
    inputToken?: string,
  ): string {
    const refreshToken = resolveRefreshToken(context.req, inputToken);
    if (!refreshToken) {
      throw new UnauthorizedException('Unauthorized');
    }
    return refreshToken;
  }

  private writeRefreshCookie(context: GqlContext, refreshToken: string): void {
    setRefreshTokenCookie(context.res, refreshToken, {
      maxAgeMs: parseTtlToMs(
        this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d',
      ),
      secure: this.isSecureCookie(),
    });
  }

  private isSecureCookie(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
