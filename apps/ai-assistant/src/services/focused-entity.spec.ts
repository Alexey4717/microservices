import { describe, expect, it } from 'vitest';

import {
  formatFocusedVideoPrompt,
  parseFocusedEntity,
  videoIdFromPagePath,
} from './focused-entity';

describe('parseFocusedEntity', () => {
  it('распознаёт карточку видео по UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(parseFocusedEntity(`/videos/${id}`)).toEqual({
      type: 'video',
      id,
    });
    expect(videoIdFromPagePath(`/videos/${id}`)).toBe(id);
  });

  it('игнорирует каталог, new и не-UUID', () => {
    expect(parseFocusedEntity('/videos')).toBeNull();
    expect(parseFocusedEntity('/videos/new')).toBeNull();
    expect(parseFocusedEntity('/videos/not-a-uuid')).toBeNull();
    expect(parseFocusedEntity('/profile')).toBeNull();
    expect(parseFocusedEntity(null)).toBeNull();
  });
});

describe('formatFocusedVideoPrompt', () => {
  it('описывает снимок или недоступность', () => {
    expect(formatFocusedVideoPrompt(null)).toContain('недоступна');
    expect(
      formatFocusedVideoPrompt({
        id: 'v1',
        title: 'Ролик',
        description: 'Описание',
        url: 'http://example/v.mp4',
        ownerUserId: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toContain('title: Ролик');
  });
});
