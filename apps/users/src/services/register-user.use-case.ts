import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcrypt';

import { emptyToUndefined } from '@libs/common';
import type { AuthResponse, RegisterRequest } from '@libs/proto';

import { BCRYPT_ROUNDS, toUserResponse } from '../helpers/auth-user-response';
import {
  assertEmail,
  assertPassword,
  normalizeEmail,
} from '../helpers/auth-validation';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(data: RegisterRequest): Promise<AuthResponse> {
    const email = normalizeEmail(data.email);
    assertEmail(email);
    assertPassword(data.password);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: emptyToUndefined(data.name),
      },
    });

    this.authSupport.emitCreated(user);
    const tokens = await this.authSupport.issueTokens(user.id, user.email);
    return { ...tokens, user: toUserResponse(user) };
  }
}
