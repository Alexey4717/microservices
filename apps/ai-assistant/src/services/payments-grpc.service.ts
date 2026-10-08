import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { type Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import { PAYMENTS_GRPC_CLIENT, createInternalMetadata } from '@libs/common';
import { PAYMENTS_SERVICE_NAME } from '@libs/proto';
import type {
  CheckoutResponse,
  CreateCheckoutRequest,
  ListMyPaymentsRequest,
  ListMyPaymentsResponse,
  PaymentResponse,
} from '@libs/proto';

interface PaymentsGrpcClient {
  createCheckout(
    data: CreateCheckoutRequest,
    metadata: Metadata,
  ): Observable<CheckoutResponse>;
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
    userId: string,
    internalToken: string,
    provider: string,
    productCode: string,
  ): Promise<CheckoutResponse> {
    return lastValueFrom(
      this.payments.createCheckout(
        { provider, productCode },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  async listMyPayments(
    userId: string,
    internalToken: string,
  ): Promise<PaymentResponse[]> {
    const response = await lastValueFrom(
      this.payments.listMyPayments(
        {},
        createInternalMetadata(internalToken, userId),
      ),
    );
    return response.payments ?? [];
  }
}
