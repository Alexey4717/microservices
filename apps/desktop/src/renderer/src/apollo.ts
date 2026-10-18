import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';

import { readAccessToken } from './auth-session';

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: new SetContextLink((prevContext) => {
    const accessToken = readAccessToken();
    if (!accessToken) {
      return prevContext;
    }

    return {
      headers: {
        ...prevContext.headers,
        authorization: `Bearer ${accessToken}`,
      },
    };
  }).concat(
    new HttpLink({
      uri: '/graphql',
      credentials: 'omit',
    }),
  ),
});
