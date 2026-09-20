import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from './prisma.service';

export const DEFAULT_TELEGRAM_LINK_TOKEN_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class TelegramLinkTokenCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramLinkTokenCleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.resolveIntervalMs();
    if (intervalMs <= 0) {
      return;
    }

    this.timer = setInterval(() => {
      void this.cleanup().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`Telegram link token cleanup failed: ${message}`);
      });
    }, intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async cleanup(): Promise<number> {
    const result = await this.prisma.telegramLinkToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });
    this.logger.log(
      `Deleted ${result.count} expired or used Telegram link tokens`,
    );
    return result.count;
  }

  private resolveIntervalMs(): number {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    if (nodeEnv === 'test') {
      return 0;
    }

    const raw = this.configService.get<string | number>(
      'TELEGRAM_LINK_TOKEN_CLEANUP_INTERVAL_MS',
    );
    if (raw === undefined || raw === null || raw === '') {
      return DEFAULT_TELEGRAM_LINK_TOKEN_CLEANUP_INTERVAL_MS;
    }

    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return parsed;
  }
}
