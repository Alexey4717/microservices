export interface CreateCheckoutRequest {
  provider: string;
  productCode?: string;
}

export interface CheckoutResponse {
  paymentId: string;
  checkoutUrl: string;
  provider: string;
  status: string;
}

export interface GetPaymentRequest {
  id: string;
}

export type ListMyPaymentsRequest = Record<string, never>;

export interface PaymentResponse {
  id: string;
  userId: string;
  productCode: string;
  provider: string;
  status: string;
  amountMinor: number;
  currency: string;
  checkoutUrl: string;
  createdAt: string;
}

export interface ListMyPaymentsResponse {
  payments: PaymentResponse[];
}
