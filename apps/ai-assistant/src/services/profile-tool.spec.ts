import { describe, expect, it, vi } from 'vitest';

import { executeGetMyProfile } from './profile-tool';
import { EMPTY_TOOL_PARAMETERS } from './tool-types';

describe('get_my_profile', () => {
  it('берёт user id из сессии и игнорирует аргументы модели', async () => {
    const readProfile = vi.fn().mockResolvedValue({
      id: 'owner',
      email: 'owner@example.com',
      name: 'Owner',
      avatarUrl: '',
      accountTier: 'BASE',
    });

    await executeGetMyProfile(
      { userId: 'attacker', email: 'other@example.com' },
      { userId: 'owner', internalToken: 'token' },
      readProfile,
    );

    expect(readProfile).toHaveBeenCalledTimes(1);
    expect(readProfile).toHaveBeenCalledWith('owner', 'token');
    expect(JSON.stringify(EMPTY_TOOL_PARAMETERS)).not.toContain('userId');
  });
});
