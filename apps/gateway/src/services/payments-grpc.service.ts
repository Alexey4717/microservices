import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import {
  PAYMENTS_GRPC_CLIENT,
  createInternalMetadata,
  mapRpcToGraphqlError,
} from '@libs/common';
import { PAYMENTS_SERVICE_NAME } from '@libs/proto';
import type {
  CheckoutResponse,
  CreateCheckoutRequest,
  GetPaymentRequest,
  ListMyPaymentsRequest,
  ListMyPaymentsResponse,
  PaymentResponse,
} from '@libs/proto';

interface PaymentsGrpcClient {
  createCheckout(
    data: CreateCheckoutRequest,
    metadata: Metadata,
  ): Observable<CheckoutResponse>;
  getPayment(
    data: GetPaymentRequest,
    metadata: Metadata,
  ): Observable<PaymentResponse>;
  listMyPayments(
    data: ListMyPaymentsRequest,
    metadata: Metadata,
  ): Observable<ListMyPaymentsResponse>;
}

@Injectable()
export class PaymentsGrpcService implements OnModuleInit {
  private payments!: PaymentsGrpcClient;

  constructor(
    @Inject(PAYMENTS_GRPC_CLIENT) private readonly client: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.payments = this.client.getService<PaymentsGrpcClient>(
      PAYMENTS_SERVICE_NAME,
    );
  }

  createCheckout(
    data: CreateCheckoutRequest,
    internalToken: string,
    userId: string,
  ): Promise<CheckoutResponse> {
    return this.callGraphql(() =>
      this.payments.createCheckout(
        data,
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  listMyPayments(
    internalToken: string,
    userId: string,
  ): Promise<ListMyPaymentsResponse> {
    return this.callGraphql(() =>
      this.payments.listMyPayments(
        {},
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  private async callGraphql<T>(factory: () => Observable<T>): Promise<T> {
    try {
      return await lastValueFrom(factory());
    } catch (error) {
      throw mapRpcToGraphqlError(error);
    }
  }
}
