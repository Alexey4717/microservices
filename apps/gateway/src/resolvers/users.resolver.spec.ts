import { GUARDS_METADATA } from '@nestjs/common/constants';

import { describe, expect, it } from 'vitest';

import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { UsersResolver } from './users.resolver';

describe('UsersResolver.telegramLinked', () => {
  it('требует JWT, как me — user id из токена, не из аргументов', () => {
    const method = (
      UsersResolver.prototype as unknown as Record<string, unknown>
    ).telegramLinked;
    const guards = Reflect.getMetadata(GUARDS_METADATA, method) as
      unknown[] | undefined;

    expect(guards).toEqual(expect.arrayContaining([GqlAuthGuard]));
    expect(typeof method).toBe('function');
  });
});
