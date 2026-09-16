import { print } from 'graphql';

import { GET_PAYMENT_QUERY } from '@/lib/graphql/documents';
import type { GraphQLResponse, PaymentModel } from '@/lib/graphql/types';
import { getGraphqlUrl } from '@/lib/graphql/url';

export async function getPayment(options: {
  id: string;
  accessToken: string;
}): Promise<PaymentModel | null> {
  const query = print(GET_PAYMENT_QUERY);
  const response = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { id: options.id },
    }),
    credentials: 'omit',
    cache: 'no-store',
  });

  let json: GraphQLResponse<{ payment?: PaymentModel | null }>;
  try {
    json = (await response.json()) as GraphQLResponse<{
      payment?: PaymentModel | null;
    }>;
  } catch {
    return null;
  }

  return json.data?.payment ?? null;
}
