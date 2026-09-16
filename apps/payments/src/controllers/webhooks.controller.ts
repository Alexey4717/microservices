import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';
import type { IncomingHttpHeaders } from 'node:http';

import { WebhookService } from '../services/webhook.service';

@Controller()
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhooks/stripe')
  @HttpCode(200)
  stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: IncomingHttpHeaders,
  ): Promise<{ received: true }> {
    return this.handle('STRIPE', req, headers);
  }

  @Post('webhooks/paypal')
  @HttpCode(200)
  paypal(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: IncomingHttpHeaders,
  ): Promise<{ received: true }> {
    return this.handle('PAYPAL', req, headers);
  }

  private async handle(
    provider: 'STRIPE' | 'PAYPAL',
    req: RawBodyRequest<Request>,
    headers: IncomingHttpHeaders,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    await this.webhookService.handle(provider, headers, rawBody);
    return { received: true };
  }
}
