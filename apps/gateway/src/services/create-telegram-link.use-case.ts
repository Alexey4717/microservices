import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphQLError } from 'graphql';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class CreateTelegramLinkUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
    private readonly configService: ConfigService,
  ) {}

  async execute(userId: string): Promise<{ url: string }> {
    const username = (
      this.configService.get<string>('TELEGRAM_BOT_USERNAME') ?? ''
    )
      .trim()
      .replace(/^@/, '');
    if (!username) {
      throw new GraphQLError('TELEGRAM_BOT_USERNAME не задан', {
        extensions: {
          code: 'FAILED_PRECONDITION',
          http: { status: 500 },
        },
      });
    }

    const issued = await this.usersGrpc.createTelegramLinkToken(
      this.writeThroughHelper.internalToken(),
      userId,
    );
    return { url: `https://t.me/${username}?start=link_${issued.token}` };
  }
}
