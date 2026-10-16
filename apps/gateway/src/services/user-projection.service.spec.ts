import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserProjectionService } from './user-projection.service';

describe('UserProjectionService', () => {
  let service: UserProjectionService;
  const upsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue(undefined);
    service = new UserProjectionService({
      userProjection: { upsert },
    } as never);
  });

  it('upsertFromCreated пишет null, если name и avatarUrl отсутствуют', async () => {
    await service.upsertFromCreated({
      userId: 'u1',
      email: 'a@example.com',
      occurredAt: '2026-09-11T10:00:00.000Z',
    } as never);

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'u1' },
      create: {
        id: 'u1',
        email: 'a@example.com',
        name: null,
        avatarUrl: null,
        accountTier: 'BASE',
      },
      update: {
        email: 'a@example.com',
        name: null,
        avatarUrl: null,
        accountTier: 'BASE',
      },
    });
  });

  it('upsertFromCreated сохраняет непустые name и avatarUrl', async () => {
    await service.upsertFromCreated({
      userId: 'u1',
      email: 'a@example.com',
      name: '  Ann  ',
      avatarUrl: 'https://cdn.example/a.png',
      accountTier: 'PREMIUM',
      occurredAt: '2026-09-11T10:00:00.000Z',
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'u1' },
      create: {
        id: 'u1',
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: 'https://cdn.example/a.png',
        accountTier: 'PREMIUM',
      },
      update: {
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: 'https://cdn.example/a.png',
        accountTier: 'PREMIUM',
      },
    });
  });

  it('findByIds не запрашивает пустой список', async () => {
    const findMany = vi.fn();
    const reader = new UserProjectionService({
      userProjection: { findMany },
    } as never);

    await expect(reader.findByIds([])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('findByIds читает проекции пачкой и мапит как findById', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'u2',
        email: 'b@example.com',
        name: null,
        avatarUrl: 'https://cdn.example/b.png',
        accountTier: 'PREMIUM',
      },
    ]);
    const reader = new UserProjectionService({
      userProjection: { findMany },
    } as never);

    await expect(reader.findByIds(['u1', 'u2'])).resolves.toEqual([
      {
        id: 'u2',
        email: 'b@example.com',
        name: '',
        avatarUrl: 'https://cdn.example/b.png',
        accountTier: 'PREMIUM',
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
    });
  });
});
