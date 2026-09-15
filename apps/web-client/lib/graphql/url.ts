export function getGraphqlUrl(): string {
  return process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:3000/graphql';
}

export function getGatewayOrigin(): string {
  return stripGraphqlSuffix(getGraphqlUrl());
}

/** Node fetch uses 127.0.0.1 to avoid Windows EACCES on ::1; browser URLs stay on localhost. */
export function getServerGraphqlUrl(): string {
  return rewriteLocalhostToIpv4(getGraphqlUrl());
}

function rewriteLocalhostToIpv4(graphqlUrl: string): string {
  try {
    const parsed = new URL(graphqlUrl);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString();
  } catch {
    return graphqlUrl;
  }
}

function stripGraphqlSuffix(graphqlUrl: string): string {
  return graphqlUrl.replace(/\/graphql\/?$/i, '') || 'http://localhost:3000';
}
