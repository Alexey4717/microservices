import { HttpLink } from '@apollo/client';
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from '@apollo/client-integration-nextjs';

import { getAccessToken } from '@/lib/auth/access-token';
import { gatewayFetch } from '@/lib/auth/gateway-fetch';
import { getGraphqlUrl } from '@/lib/graphql/url';

export const { getClient, query, PreloadQuery } = registerApolloClient(
  async () => {
    const accessToken = await getAccessToken();

    return new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: getGraphqlUrl(),
        fetch: gatewayFetch,
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
      }),
    });
  },
);
