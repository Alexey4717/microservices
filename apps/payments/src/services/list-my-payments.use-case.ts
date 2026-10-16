import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type {
  ListMyPaymentsRequest,
  ListMyPaymentsResponse,
} from '@libs/proto';

import { toPaymentResponse } from '../helpers/payment-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class ListMyPaymentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _data: ListMyPaymentsRequest,
    metadata: Metadata,
  ): Promise<ListMyPaymentsResponse> {
    const userId = requireUserId(metadata);
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { payments: payments.map(toPaymentResponse) };
  }
}
