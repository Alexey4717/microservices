'use client';

import { HttpLink } from '@apollo/client';
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from '@apollo/client-integration-nextjs';
import { SetContextLink } from '@apollo/client/link/context';
import type { ReactNode } from 'react';

import { getGraphqlUrl } from '@/lib/graphql/url';

type ApolloWrapperProps = {
  children: ReactNode;
  accessToken: string | null;
};

export function ApolloWrapper({ children, accessToken }: ApolloWrapperProps) {
  function makeClient() {
    const httpLink = new HttpLink({
      uri: getGraphqlUrl(),
      credentials: 'omit',
      fetchOptions: { cache: 'no-store' },
      headers: {
        'Apollo-Require-Preflight': 'true',
      },
    });

    const authLink = new SetContextLink((prevContext) => {
      if (!accessToken) {
        return prevContext;
      }

      return {
        headers: {
          ...prevContext.headers,
          authorization: `Bearer ${accessToken}`,
        },
      };
    });

    return new ApolloClient({
      cache: new InMemoryCache(),
      link: authLink.concat(httpLink),
    });
  }

  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
