export type AccountTier = 'BASE' | 'PREMIUM';

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  accountTier: AccountTier;
};

export class GraphqlRequestError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GraphqlRequestError';
    this.code = code;
  }
}

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

async function graphql<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  let payload: GraphqlResponse<T>;
  try {
    payload = (await response.json()) as GraphqlResponse<T>;
  } catch {
    throw new GraphqlRequestError(
      response.ok
        ? 'Некорректный ответ сервера.'
        : `Сервер ответил ${response.status}. Проверьте, что gateway запущен.`,
    );
  }
  const firstError = payload.errors?.[0];
  if (firstError) {
    throw new GraphqlRequestError(
      firstError.message,
      firstError.extensions?.code,
    );
  }
  if (!payload.data) {
    throw new GraphqlRequestError('Пустой ответ GraphQL');
  }
  return payload.data;
}

const USER_FIELDS = `
  id
  email
  name
  avatarUrl
  accountTier
`;

export async function loginWithTelegram(initData: string): Promise<{
  accessToken: string;
  user: SessionUser;
}> {
  const data = await graphql<{
    loginWithTelegram: { accessToken: string; user: SessionUser };
  }>(
    `mutation LoginWithTelegram($initData: String!) {
      loginWithTelegram(initData: $initData) {
        accessToken
        user { ${USER_FIELDS} }
      }
    }`,
    { initData },
  );
  return data.loginWithTelegram;
}

export async function fetchMe(accessToken: string): Promise<SessionUser> {
  const data = await graphql<{ me: SessionUser }>(
    `query Me { me { ${USER_FIELDS} } }`,
    undefined,
    accessToken,
  );
  return data.me;
}
