const DEFAULT_GRAPHQL_URL = 'http://10.0.2.2:3000/graphql';

export function graphqlUrl(): string {
  const configured = process.env.EXPO_PUBLIC_GRAPHQL_URL?.trim();
  return configured || DEFAULT_GRAPHQL_URL;
}

export function gatewayOrigin(): string {
  return graphqlUrl().replace(/\/graphql\/?$/, '');
}
