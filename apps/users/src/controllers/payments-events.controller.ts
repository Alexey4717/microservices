import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';

import {
  PAYMENT_EVENTS,
  type PaymentEventPayload,
  ackRmqMessage,
  nackRmqMessage,
} from '@libs/common';

import { PaymentsEventsService } from '../services/payments-events.service';

@Controller()
export class PaymentsEventsController {
  private readonly logger = new Logger(PaymentsEventsController.name);

  constructor(private readonly paymentsEventsService: PaymentsEventsService) {}

  @EventPattern(PAYMENT_EVENTS.COMPLETED)
  async handlePaymentCompleted(
    @Payload() payload: PaymentEventPayload,
    @Ctx() context: unknown,
  ): Promise<void> {
    try {
      await this.paymentsEventsService.upgradeFromPayment(payload);
      ackRmqMessage(context);
    } catch (error) {
      this.logger.error(
        `Не удалось обработать ${PAYMENT_EVENTS.COMPLETED}: ${
          error instanceof Error ? error.message : String(error)
        }. Сообщение вернётся в очередь.`,
        error instanceof Error ? error.stack : undefined,
      );
      nackRmqMessage(context, true);
    }
  }
}
