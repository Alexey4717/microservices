import { type DocumentNode, print } from 'graphql';

import type { AuthUser, GraphQLResponse } from '@/lib/graphql/types';
import { getGraphqlUrl } from '@/lib/graphql/url';

const PREFLIGHT_HEADER = 'Apollo-Require-Preflight';

export async function uploadAvatarMultipart(options: {
  document: DocumentNode;
  file: File;
  accessToken: string;
}): Promise<AuthUser> {
  const query = print(options.document);
  const operations = JSON.stringify({
    query,
    variables: { file: null },
  });
  const map = JSON.stringify({
    '0': ['variables.file'],
  });

  const body = new FormData();
  body.append('operations', operations);
  body.append('map', map);
  body.append('0', options.file, options.file.name);

  const response = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      [PREFLIGHT_HEADER]: 'true',
    },
    body,
    credentials: 'omit',
    cache: 'no-store',
  });

  let json: GraphQLResponse<{ uploadAvatar?: AuthUser }>;
  try {
    json = (await response.json()) as GraphQLResponse<{
      uploadAvatar?: AuthUser;
    }>;
  } catch {
    throw new Error('Не удалось загрузить аватар. Попробуйте ещё раз.');
  }

  const user = json.data?.uploadAvatar;
  if (user?.id && user.avatarUrl) {
    return user;
  }

  throw new Error(uploadErrorMessage(json));
}

function uploadErrorMessage(json: GraphQLResponse<unknown>): string {
  const message = json.errors?.[0]?.message ?? '';
  if (/unauthor|unauthenticated/i.test(message)) {
    return 'Сессия истекла. Войдите снова и повторите загрузку.';
  }
  if (/unsupported image type/i.test(message)) {
    return 'Неподдерживаемый тип файла. Выберите JPEG, PNG, WebP или GIF.';
  }
  if (/file too large/i.test(message)) {
    return 'Файл слишком большой. Максимум 2\u00a0МБ.';
  }
  if (message) {
    return message;
  }
  return 'Не удалось загрузить аватар. Попробуйте ещё раз.';
}
