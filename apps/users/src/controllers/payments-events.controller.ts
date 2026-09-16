import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { PAYMENT_EVENTS, type PaymentEventPayload } from '@libs/common';

import { PaymentsEventsService } from '../services/payments-events.service';

@Controller()
export class PaymentsEventsController {
  constructor(private readonly paymentsEventsService: PaymentsEventsService) {}

  @EventPattern(PAYMENT_EVENTS.COMPLETED)
  handlePaymentCompleted(
    @Payload() payload: PaymentEventPayload,
  ): Promise<void> {
    return this.paymentsEventsService.upgradeFromPayment(payload);
  }
}
