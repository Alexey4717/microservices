import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';

import { resolveGraphqlUrl } from '../../shared/graphql-url';
import { readAccessToken } from './auth-session';

const graphqlUri = import.meta.env.DEV
  ? '/graphql'
  : resolveGraphqlUrl(import.meta.env.RENDERER_VITE_GRAPHQL_URL);

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
      uri: graphqlUri,
      credentials: 'omit',
    }),
  ),
});
