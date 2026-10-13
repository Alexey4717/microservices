import { describe, expect, it } from 'vitest';

import { isPublicAppPath } from './public-paths';

describe('isPublicAppPath', () => {
  it('открывает каталог и карточку UUID', () => {
    expect(isPublicAppPath('/videos')).toBe(true);
    expect(
      isPublicAppPath('/videos/550e8400-e29b-41d4-a716-446655440000'),
    ).toBe(true);
  });

  it('не открывает new и прочие app-пути', () => {
    expect(isPublicAppPath('/videos/new')).toBe(false);
    expect(isPublicAppPath('/videos/not-uuid')).toBe(false);
    expect(isPublicAppPath('/profile')).toBe(false);
    expect(isPublicAppPath('/')).toBe(false);
  });
});
