import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import type { IncomingHttpHeaders } from 'node:http';

import { PAYMENT_PROVIDERS, PAYMENT_STATUSES } from '../payment-constants';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  ParsedWebhook,
  PaymentProviderStrategy,
} from './payment-provider.strategy';
import { PaypalClient } from './paypal-client';

type PaypalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    purchase_units?: Array<{ custom_id?: string }>;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

@Injectable()
export class PaypalPaymentStrategy implements PaymentProviderStrategy {
  readonly provider = PAYMENT_PROVIDERS.PAYPAL;

  constructor(
    private readonly paypalClient: PaypalClient,
    private readonly configService: ConfigService,
  ) {}

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    this.assertConfigured();
    const order = await this.paypalClient.createOrder({
      paymentId: input.paymentId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    const approve = order.links?.find(
      (link) => link.rel === 'approve' || link.rel === 'payer-action',
    );
    if (!order.id || !approve?.href) {
      throw new RpcException({
        code: status.INTERNAL,
        message: 'PayPal did not return an approve URL',
      });
    }

    return { externalId: order.id, checkoutUrl: approve.href };
  }

  async parseWebhook(
    headers: IncomingHttpHeaders,
    rawBody: Buffer,
  ): Promise<ParsedWebhook> {
    let event: PaypalWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as PaypalWebhookEvent;
    } catch {
      throw new BadRequestException('Invalid PayPal webhook payload');
    }

    const verified = await this.paypalClient.verifyWebhookSignature(
      headers,
      event,
    );
    if (!verified) {
      throw new BadRequestException('Invalid PayPal webhook signature');
    }

    const eventId = event.id;
    if (!eventId) {
      throw new BadRequestException('Missing PayPal event id');
    }

    const resource = event.resource ?? {};
    const paymentId =
      resource.custom_id || resource.purchase_units?.[0]?.custom_id;
    const externalId =
      event.event_type?.startsWith('CHECKOUT.ORDER') === true
        ? (resource.id ?? null)
        : (resource.supplementary_data?.related_ids?.order_id ??
          resource.id ??
          null);

    const eventType = event.event_type ?? '';
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      return {
        eventId,
        externalId,
        paymentId,
        status: null,
        shouldCapture: true,
      };
    }
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      return {
        eventId,
        externalId,
        paymentId,
        status: PAYMENT_STATUSES.SUCCEEDED,
      };
    }
    if (
      eventType === 'PAYMENT.CAPTURE.DENIED' ||
      eventType === 'PAYMENT.CAPTURE.DECLINED'
    ) {
      return {
        eventId,
        externalId,
        paymentId,
        status: PAYMENT_STATUSES.FAILED,
      };
    }
    if (eventType === 'CHECKOUT.ORDER.VOIDED') {
      return {
        eventId,
        externalId,
        paymentId,
        status: PAYMENT_STATUSES.CANCELED,
      };
    }

    return { eventId, externalId, paymentId, status: null };
  }

  captureOrder(externalId: string): Promise<void> {
    return this.paypalClient.captureOrder(externalId);
  }

  private assertConfigured(): void {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: 'PayPal credentials are not configured',
      });
    }
  }
}
