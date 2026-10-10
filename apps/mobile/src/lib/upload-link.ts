import { print } from 'graphql';

import { ApolloLink, Observable } from '@apollo/client';

import { readAccessToken } from '@/lib/auth-session';
import type { AvatarUploadFile } from '@/lib/avatar';
import { graphqlUrl } from '@/lib/graphql-url';

const PREFLIGHT_HEADER = 'Apollo-Require-Preflight';

type NativeUploadFile = AvatarUploadFile;

export const uploadLink = new ApolloLink((operation) => {
  return new Observable((observer) => {
    const controller = new AbortController();

    void sendUpload(operation, controller.signal)
      .then((result) => {
        observer.next(result);
        observer.complete();
      })
      .catch((error: unknown) => {
        observer.error(
          error instanceof Error
            ? error
            : new Error('Не удалось загрузить аватар. Попробуйте ещё раз.'),
        );
      });

    return () => {
      controller.abort();
    };
  });
});

async function sendUpload(
  operation: ApolloLink.Operation,
  signal: AbortSignal,
): Promise<ApolloLink.Result> {
  const file = operation.variables?.file;
  const query = print(operation.query);
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
  appendFile(body, file);

  const headers = new Headers();
  const accessToken = readAccessToken();
  const contextHeaders = operation.getContext().headers;
  if (contextHeaders && typeof contextHeaders === 'object') {
    for (const [key, value] of Object.entries(
      contextHeaders as Record<string, unknown>,
    )) {
      if (typeof value === 'string' && key.toLowerCase() !== 'content-type') {
        headers.set(key, value);
      }
    }
  }
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  headers.set(PREFLIGHT_HEADER, 'true');

  const response = await fetch(graphqlUrl(), {
    method: 'POST',
    headers,
    body,
    credentials: 'omit',
    signal,
  });

  try {
    return (await response.json()) as ApolloLink.Result;
  } catch {
    throw new Error('Не удалось загрузить аватар. Попробуйте ещё раз.');
  }
}

function appendFile(body: FormData, file: unknown): void {
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    const name = file instanceof File && file.name ? file.name : 'avatar';
    body.append('0', file, name);
    return;
  }

  if (!isNativeUpload(file)) {
    throw new Error('Не удалось загрузить аватар. Попробуйте ещё раз.');
  }

  body.append('0', file as unknown as Blob);
}

function isNativeUpload(file: unknown): file is NativeUploadFile {
  if (!file || typeof file !== 'object') {
    return false;
  }
  const candidate = file as Partial<NativeUploadFile>;
  return (
    typeof candidate.uri === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string'
  );
}
