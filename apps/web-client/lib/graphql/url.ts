export function getGraphqlUrl(): string {
  return process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:3000/graphql';
}
