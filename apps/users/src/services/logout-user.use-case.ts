import { Injectable } from '@nestjs/common';

import type { Empty, LogoutRequest } from '@libs/proto';

import { hashToken } from '../helpers/auth-tokens';
import { PrismaService } from './prisma.service';

@Injectable()
export class LogoutUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: LogoutRequest): Promise<Empty> {
    const refreshToken = data.refreshToken?.trim();
    if (!refreshToken) {
      return {};
    }

    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {};
  }
}
