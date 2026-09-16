import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import type { IncomingHttpHeaders } from 'node:http';
import Stripe from 'stripe';

import { PAYMENT_PROVIDERS, PAYMENT_STATUSES } from '../payment-constants';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  ParsedWebhook,
  PaymentProviderStrategy,
} from './payment-provider.strategy';

@Injectable()
export class StripePaymentStrategy implements PaymentProviderStrategy {
  readonly provider = PAYMENT_PROVIDERS.STRIPE;
  private client: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {}

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.paymentId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: input.productCode },
          },
        },
      ],
      metadata: {
        paymentId: input.paymentId,
        userId: input.userId,
        productCode: input.productCode,
      },
      payment_intent_data: {
        metadata: {
          paymentId: input.paymentId,
          userId: input.userId,
          productCode: input.productCode,
        },
      },
    });

    if (!session.id || !session.url) {
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Stripe did not return a checkout URL',
      });
    }

    return { externalId: session.id, checkoutUrl: session.url };
  }

  parseWebhook(
    headers: IncomingHttpHeaders,
    rawBody: Buffer,
  ): Promise<ParsedWebhook> {
    const signature = headerValue(headers, 'stripe-signature');
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    const webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    const object = event.data.object as {
      id?: string;
      metadata?: Record<string, string>;
      client_reference_id?: string | null;
    };
    const paymentId =
      object.metadata?.paymentId || object.client_reference_id || undefined;
    const externalId = object.id ?? null;

    let parsedStatus: ParsedWebhook['status'] = null;
    if (event.type === 'checkout.session.completed') {
      parsedStatus = PAYMENT_STATUSES.SUCCEEDED;
    } else if (event.type === 'checkout.session.expired') {
      parsedStatus = PAYMENT_STATUSES.CANCELED;
    } else if (event.type === 'payment_intent.payment_failed') {
      parsedStatus = PAYMENT_STATUSES.FAILED;
    }

    return Promise.resolve({
      eventId: event.id,
      externalId,
      paymentId,
      status: parsedStatus,
    });
  }

  private getClient(): Stripe {
    const secret = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    if (!secret) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: 'STRIPE_SECRET_KEY is not configured',
      });
    }
    this.client ??= new Stripe(secret);
    return this.client;
  }
}

function headerValue(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
