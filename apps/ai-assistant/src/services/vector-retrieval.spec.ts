import { describe, expect, it, vi } from 'vitest';

import { VectorRetrieval } from './vector-retrieval';

describe('поиск справки', () => {
  it('не фильтрует общую справку по user id и молчит, если эмбеддинг пуст', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValue([
        { id: 'chunk-1', source: 'profile.md', content: 'Профиль' },
      ]);
    const embed = vi.fn().mockResolvedValue([0.1, 0.2]);
    const retrieval = new VectorRetrieval(
      { $queryRaw: queryRaw } as never,
      { embed } as never,
    );

    const hits = await retrieval.retrieve({
      userId: 'secret-user',
      query: 'как сменить имя',
    });

    expect(hits).toEqual([
      { id: 'chunk-1', source: 'profile.md', content: 'Профиль' },
    ]);
    expect(JSON.stringify(queryRaw.mock.calls)).not.toContain('secret-user');
  });

  it('возвращает пустой список, если эмбеддинги недоступны', async () => {
    const queryRaw = vi.fn();
    const retrieval = new VectorRetrieval(
      { $queryRaw: queryRaw } as never,
      { embed: vi.fn().mockResolvedValue(null) } as never,
    );

    await expect(
      retrieval.retrieve({ userId: 'owner', query: 'профиль' }),
    ).resolves.toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('не роняет ответ, если поиск упал', async () => {
    const retrieval = new VectorRetrieval(
      {
        $queryRaw: vi
          .fn()
          .mockRejectedValue(new Error('нет расширения vector')),
      } as never,
      { embed: vi.fn().mockResolvedValue([0.2]) } as never,
    );

    await expect(
      retrieval.retrieve({ userId: 'owner', query: 'оплата' }),
    ).resolves.toEqual([]);
  });
});
