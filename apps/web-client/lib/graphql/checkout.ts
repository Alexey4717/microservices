import { print } from 'graphql';

import { CREATE_CHECKOUT_MUTATION } from '@/lib/graphql/documents';
import type {
  CheckoutPayload,
  GraphQLResponse,
  PaymentProvider,
} from '@/lib/graphql/types';
import { getGraphqlUrl } from '@/lib/graphql/url';

export type CheckoutErrorCode = 'CONFLICT' | 'UNAUTHENTICATED' | 'UNKNOWN';

export class CheckoutError extends Error {
  readonly code: CheckoutErrorCode;

  constructor(message: string, code: CheckoutErrorCode) {
    super(message);
    this.name = 'CheckoutError';
    this.code = code;
  }
}

export function isCheckoutConflict(error: unknown): boolean {
  return error instanceof CheckoutError && error.code === 'CONFLICT';
}

export async function createCheckout(options: {
  provider: PaymentProvider;
  accessToken: string;
}): Promise<CheckoutPayload> {
  const query = print(CREATE_CHECKOUT_MUTATION);
  const response = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { input: { provider: options.provider } },
    }),
    credentials: 'omit',
    cache: 'no-store',
  });

  let json: GraphQLResponse<{ createCheckout?: CheckoutPayload }>;
  try {
    json = (await response.json()) as GraphQLResponse<{
      createCheckout?: CheckoutPayload;
    }>;
  } catch {
    throw new CheckoutError(
      'Не удалось создать оплату. Попробуйте ещё раз.',
      'UNKNOWN',
    );
  }

  const payload = json.data?.createCheckout;
  if (payload?.checkoutUrl) {
    return payload;
  }

  throw checkoutErrorFromResponse(json);
}

function checkoutErrorFromResponse(
  json: GraphQLResponse<unknown>,
): CheckoutError {
  const error = json.errors?.[0];
  const code = error?.extensions?.code;
  const message = error?.message ?? '';
  const status = error?.extensions?.http?.status;

  if (
    code === 'CONFLICT' ||
    status === 409 ||
    /already purchased/i.test(message)
  ) {
    return new CheckoutError('PREMIUM уже куплен', 'CONFLICT');
  }

  if (
    code === 'UNAUTHENTICATED' ||
    status === 401 ||
    /unauthor|unauthenticated/i.test(message)
  ) {
    return new CheckoutError('Сессия истекла', 'UNAUTHENTICATED');
  }

  return new CheckoutError(
    'Не удалось создать оплату. Попробуйте ещё раз.',
    'UNKNOWN',
  );
}
