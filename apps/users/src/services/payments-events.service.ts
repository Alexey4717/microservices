import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import {
  PAYMENT_EVENTS,
  type PaymentEventPayload,
  USERS_RMQ_CLIENT,
  USER_EVENTS,
  type UserUpdatedEvent,
} from '@libs/common';

import { PrismaService } from './prisma.service';

export const ACCOUNT_TIER_PREMIUM = 'PREMIUM';
export const PRODUCT_CODE_PREMIUM = 'PREMIUM';

@Injectable()
export class PaymentsEventsService {
  private readonly logger = new Logger(PaymentsEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(USERS_RMQ_CLIENT) private readonly rmqClient: ClientProxy,
  ) {}

  async upgradeFromPayment(payload: PaymentEventPayload): Promise<void> {
    if (!payload?.userId) {
      this.logger.warn(`Пропускаю ${PAYMENT_EVENTS.COMPLETED}: нет userId`);
      return;
    }
    if (payload.productCode !== PRODUCT_CODE_PREMIUM) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      this.logger.warn(
        `Пропускаю ${PAYMENT_EVENTS.COMPLETED}: пользователь ${payload.userId} не найден`,
      );
      return;
    }
    if (user.accountTier === ACCOUNT_TIER_PREMIUM) {
      return;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { accountTier: ACCOUNT_TIER_PREMIUM },
    });

    const event: UserUpdatedEvent = {
      userId: updated.id,
      email: updated.email,
      name: updated.name ?? '',
      avatarUrl: updated.avatarUrl ?? '',
      accountTier: updated.accountTier,
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.UPDATED, event);
  }
}
