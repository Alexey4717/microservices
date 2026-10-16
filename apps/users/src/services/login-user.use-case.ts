import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcrypt';

import type { AuthResponse, LoginRequest } from '@libs/proto';

import { toUserResponse } from '../helpers/auth-user-response';
import { assertEmail, normalizeEmail } from '../helpers/auth-validation';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class LoginUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(data: LoginRequest): Promise<AuthResponse> {
    const email = normalizeEmail(data.email);
    assertEmail(email);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid credentials',
      });
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid credentials',
      });
    }

    this.authSupport.emitAuthenticated(user.id, user.email, 'password');
    const tokens = await this.authSupport.issueTokens(user.id, user.email);
    return { ...tokens, user: toUserResponse(user) };
  }
}
