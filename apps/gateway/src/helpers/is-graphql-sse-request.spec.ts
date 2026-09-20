import { describe, expect, it } from 'vitest';

import { isGraphqlSseRequest } from './is-graphql-sse-request';

describe('isGraphqlSseRequest', () => {
  it('распознаёт graphql-sse distinct connections', () => {
    expect(
      isGraphqlSseRequest({ headers: { accept: 'text/event-stream' } }),
    ).toBe(true);
  });

  it('не перехватывает GraphiQL', () => {
    expect(
      isGraphqlSseRequest({
        headers: { accept: 'text/html,application/xhtml+xml' },
      }),
    ).toBe(false);
  });

  it('не перехватывает обычный GraphQL JSON', () => {
    expect(
      isGraphqlSseRequest({ headers: { accept: 'application/json' } }),
    ).toBe(false);
  });
});
