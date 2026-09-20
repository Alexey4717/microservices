import { describe, expect, it } from 'vitest';

import type { UserResponse } from '@libs/proto';

import { AccountTier } from '../models/account-tier.enum';
import { toUserModel } from './auth.mapper';

describe('toUserModel', () => {
  const baseUser: UserResponse = {
    id: 'u1',
    email: 'a@example.com',
    name: 'Ann',
    avatarUrl: '',
    accountTier: 'BASE',
  };

  it('без telegram — поле отсутствует', () => {
    expect(toUserModel(baseUser).telegram).toBeUndefined();
  });

  it('мапит снимок Telegram в camelCase GraphQL', () => {
    const mapped = toUserModel({
      ...baseUser,
      telegram: {
        userId: '100',
        username: 'ann_tg',
        firstName: 'Ann',
        lastName: 'Smith',
        photoUrl: 'https://cdn.example/tg.jpg',
      },
    });

    expect(mapped.accountTier).toBe(AccountTier.BASE);
    expect(mapped.telegram).toEqual({
      userId: '100',
      username: 'ann_tg',
      firstName: 'Ann',
      userLastName: 'Smith',
      photoUrl: 'https://cdn.example/tg.jpg',
    });
  });

  it('пустой telegram.userId считает профиль непривязанным', () => {
    expect(
      toUserModel({
        ...baseUser,
        telegram: {
          userId: '',
          username: '',
          firstName: '',
          lastName: '',
          photoUrl: '',
        },
      }).telegram,
    ).toBeUndefined();
  });
});
