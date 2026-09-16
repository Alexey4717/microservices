import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';

import { PAYMENTS_SERVICE_NAME } from '@libs/proto';
import type {
  CheckoutResponse,
  CreateCheckoutRequest,
  GetPaymentRequest,
  ListMyPaymentsRequest,
  ListMyPaymentsResponse,
  PaymentResponse,
} from '@libs/proto';

import { PaymentsService } from '../services/payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'CreateCheckout')
  createCheckout(
    data: CreateCheckoutRequest,
    metadata: Metadata,
  ): Promise<CheckoutResponse> {
    return this.paymentsService.createCheckout(data, metadata);
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'GetPayment')
  getPayment(
    data: GetPaymentRequest,
    metadata: Metadata,
  ): Promise<PaymentResponse> {
    return this.paymentsService.getPayment(data, metadata);
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'ListMyPayments')
  listMyPayments(
    data: ListMyPaymentsRequest,
    metadata: Metadata,
  ): Promise<ListMyPaymentsResponse> {
    return this.paymentsService.listMyPayments(data, metadata);
  }
}
