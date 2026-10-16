import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import { emptyToUndefined } from '@libs/common';
import type { AuthResponse, OauthUpsertRequest } from '@libs/proto';

import { assertEmail, normalizeEmail } from '../helpers/auth-validation';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class OauthUpsertUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(data: OauthUpsertRequest): Promise<AuthResponse> {
    const provider = data.provider?.trim().toLowerCase();
    const providerAccountId = data.providerAccountId?.trim();
    const email = normalizeEmail(data.email);

    if (!provider || !['google', 'github'].includes(provider)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Unsupported OAuth provider',
      });
    }
    if (!providerAccountId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'providerAccountId is required',
      });
    }
    assertEmail(email);

    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      include: { user: true },
    });

    if (existingAccount) {
      const user = await this.prisma.user.update({
        where: { id: existingAccount.userId },
        data: {
          name: emptyToUndefined(data.name) ?? existingAccount.user.name,
          avatarUrl:
            emptyToUndefined(data.avatarUrl) ?? existingAccount.user.avatarUrl,
        },
      });
      this.authSupport.emitUpdated(user);
      this.authSupport.emitAuthenticated(user.id, user.email, 'oauth');
      const tokens = await this.authSupport.issueTokens(user.id, user.email);
      return {
        ...tokens,
        user: await this.authSupport.userResponseById(user.id),
      };
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    let created = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: emptyToUndefined(data.name),
          avatarUrl: emptyToUndefined(data.avatarUrl),
        },
      });
      created = true;
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: emptyToUndefined(data.name) ?? user.name,
          avatarUrl: emptyToUndefined(data.avatarUrl) ?? user.avatarUrl,
        },
      });
    }

    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
      },
    });

    if (created) {
      this.authSupport.emitCreated(user);
    } else {
      this.authSupport.emitUpdated(user);
    }
    this.authSupport.emitAuthenticated(user.id, user.email, 'oauth');
    const tokens = await this.authSupport.issueTokens(user.id, user.email);
    return {
      ...tokens,
      user: await this.authSupport.userResponseById(user.id),
    };
  }
}
