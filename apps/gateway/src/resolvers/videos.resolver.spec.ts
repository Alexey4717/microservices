import { GUARDS_METADATA } from '@nestjs/common/constants';

import { describe, expect, it } from 'vitest';

import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { VideosResolver } from './videos.resolver';

describe('VideosResolver auth', () => {
  it('оставляет CUD под GqlAuthGuard', () => {
    for (const name of ['createVideoUpload', 'completeVideoUpload'] as const) {
      const method = (
        VideosResolver.prototype as unknown as Record<string, unknown>
      )[name];
      const guards = Reflect.getMetadata(GUARDS_METADATA, method) as
        unknown[] | undefined;
      expect(guards).toEqual(expect.arrayContaining([GqlAuthGuard]));
    }
  });

  it('делает videos и video публичными', () => {
    for (const name of ['videos', 'video'] as const) {
      const method = (
        VideosResolver.prototype as unknown as Record<string, unknown>
      )[name];
      const guards = Reflect.getMetadata(GUARDS_METADATA, method) as
        unknown[] | undefined;
      expect(guards ?? []).not.toEqual(expect.arrayContaining([GqlAuthGuard]));
    }
  });
});
