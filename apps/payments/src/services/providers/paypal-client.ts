import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { IncomingHttpHeaders } from 'node:http';

type PaypalTokenResponse = {
  access_token: string;
  expires_in: number;
};

type PaypalOrderResponse = {
  id: string;
  links?: Array<{ href: string; rel: string }>;
};

type PaypalVerifyResponse = {
  verification_status?: string;
};

@Injectable()
export class PaypalClient {
  private readonly logger = new Logger(PaypalClient.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  apiBase(): string {
    return (
      this.configService.get<string>('PAYPAL_API_BASE') ??
      'https://api-m.sandbox.paypal.com'
    ).replace(/\/$/, '');
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.value;
    }

    const clientId = this.configService.getOrThrow<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'PAYPAL_CLIENT_SECRET',
    );
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch(`${this.apiBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`PayPal OAuth failed: ${response.status} ${body}`);
      throw new Error('PayPal OAuth failed');
    }

    const json = (await response.json()) as PaypalTokenResponse;
    this.cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + Math.max(json.expires_in - 60, 30) * 1000,
    };
    return this.cachedToken.value;
  }

  async createOrder(input: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaypalOrderResponse> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.apiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: input.paymentId,
            amount: {
              currency_code: input.currency.toUpperCase(),
              value: formatMajorAmount(input.amountMinor),
            },
          },
        ],
        application_context: {
          return_url: input.successUrl,
          cancel_url: input.cancelUrl,
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `PayPal create order failed: ${response.status} ${body}`,
      );
      throw new Error('PayPal create order failed');
    }

    return (await response.json()) as PaypalOrderResponse;
  }

  async captureOrder(orderId: string): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.ok) {
      return;
    }

    const body = await response.text();
    if (response.status === 422 && body.includes('ORDER_ALREADY_CAPTURED')) {
      return;
    }

    this.logger.error(`PayPal capture failed: ${response.status} ${body}`);
    throw new Error('PayPal capture failed');
  }

  async verifyWebhookSignature(
    headers: IncomingHttpHeaders,
    webhookEvent: unknown,
  ): Promise<boolean> {
    const webhookId =
      this.configService.getOrThrow<string>('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      return false;
    }

    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.apiBase()}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: headerValue(headers, 'paypal-auth-algo'),
          cert_url: headerValue(headers, 'paypal-cert-url'),
          transmission_id: headerValue(headers, 'paypal-transmission-id'),
          transmission_sig: headerValue(headers, 'paypal-transmission-sig'),
          transmission_time: headerValue(headers, 'paypal-transmission-time'),
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `PayPal verify signature failed: ${response.status} ${body}`,
      );
      return false;
    }

    const json = (await response.json()) as PaypalVerifyResponse;
    return json.verification_status === 'SUCCESS';
  }
}

export function formatMajorAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}
