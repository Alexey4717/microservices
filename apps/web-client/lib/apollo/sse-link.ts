'use client';

import { ApolloLink } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { print } from '@apollo/client/utilities';
import { createClient } from 'graphql-sse';
import { Observable } from 'rxjs';

type GraphqlSseLinkOptions = {
  url: string;
};

export class GraphqlSseLink extends ApolloLink {
  private readonly url: string;

  constructor(options: GraphqlSseLinkOptions) {
    super();
    this.url = options.url;
  }

  override request(
    operation: ApolloLink.Operation,
  ): Observable<ApolloLink.Result> {
    const client = createClient({
      singleConnection: false,
      url: this.url,
      credentials: 'omit',
      retryAttempts: operation.operationName === 'AiAssistantReply' ? 0 : 5,
      headers: () => headerRecord(operation.getContext().headers),
    });

    return new Observable((observer) => {
      const { query, variables, operationName, extensions } = operation;
      const unsubscribe = client.subscribe(
        {
          query: print(query),
          variables,
          operationName,
          extensions,
        },
        {
          next: observer.next.bind(observer),
          complete: observer.complete.bind(observer),
          error: (error: unknown) => {
            if (error instanceof Error) {
              observer.error(error);
              return;
            }
            observer.error(
              new CombinedGraphQLErrors({
                errors: Array.isArray(error) ? error : [error],
              }),
            );
          },
        },
      );

      return () => {
        unsubscribe();
        client.dispose();
      };
    });
  }
}

function headerRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') {
      headers[key] = item;
    }
  }
  return headers;
}
