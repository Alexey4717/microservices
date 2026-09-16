export type AccountTier = 'BASE' | 'PREMIUM';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  accountTier: AccountTier;
};

export type AuthPayload = {
  accessToken: string;
  user: AuthUser;
};

export type PaymentProvider = 'STRIPE' | 'PAYPAL';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

export type CheckoutPayload = {
  paymentId: string;
  checkoutUrl: string;
  provider: PaymentProvider;
  status: PaymentStatus;
};

export type PaymentModel = {
  id: string;
  productCode: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  checkoutUrl?: string | null;
  createdAt: string;
};

export type GraphQLErrorShape = {
  message: string;
  extensions?: {
    code?: string;
    http?: { status?: number };
  };
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLErrorShape[];
};

export function toAccountTier(value: unknown): AccountTier {
  return value === 'PREMIUM' ? 'PREMIUM' : 'BASE';
}
