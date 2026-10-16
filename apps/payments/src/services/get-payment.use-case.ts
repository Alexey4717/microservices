import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type { GetPaymentRequest, PaymentResponse } from '@libs/proto';

import { toPaymentResponse } from '../helpers/payment-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class GetPaymentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    data: GetPaymentRequest,
    metadata: Metadata,
  ): Promise<PaymentResponse> {
    const userId = requireUserId(metadata);
    const id = data.id?.trim();
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Payment id is required',
      });
    }

    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment || payment.userId !== userId) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    return toPaymentResponse(payment);
  }
}
