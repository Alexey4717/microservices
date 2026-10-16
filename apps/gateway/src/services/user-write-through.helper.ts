import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { UserResponse } from '@libs/proto';

import { UserProjectionService } from './user-projection.service';

@Injectable()
export class UserWriteThroughHelper {
  private readonly logger = new Logger(UserWriteThroughHelper.name);

  constructor(
    private readonly userProjection: UserProjectionService,
    private readonly configService: ConfigService,
  ) {}

  internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }

  async writeThrough(user: UserResponse | undefined): Promise<void> {
    if (!user?.id || !user.email) {
      return;
    }

    try {
      await this.userProjection.upsertFromProfile(user);
    } catch (error) {
      this.logger.warn(
        `Не удалось обновить проекцию пользователя ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
