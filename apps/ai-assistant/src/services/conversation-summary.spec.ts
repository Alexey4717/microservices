import { describe, expect, it } from 'vitest';

import {
  formatSummaryRequest,
  selectUncoveredMessages,
} from './conversation-summary';

const ordered = [
  { id: '1', role: 'user', content: 'старое' },
  { id: '2', role: 'assistant', content: 'уже в сводке' },
  { id: '3', role: 'user', content: 'новый кусок' },
  { id: '4', role: 'assistant', content: 'свежий ответ' },
];

describe('сводка истории', () => {
  it('не пересчитывает уже покрытые сообщения', () => {
    const uncovered = selectUncoveredMessages(ordered, 3, '2');

    expect(uncovered.map((message) => message.id)).toEqual(['3']);
    expect(uncovered.some((message) => message.content === 'старое')).toBe(
      false,
    );
    expect(
      uncovered.some((message) => message.content === 'уже в сводке'),
    ).toBe(false);
    expect(formatSummaryRequest('прежняя сводка', uncovered)).not.toContain(
      'старое',
    );
    expect(formatSummaryRequest('прежняя сводка', uncovered)).toContain(
      'новый кусок',
    );
  });

  it('пропускает повтор, если отброшенный кусок уже покрыт', () => {
    expect(selectUncoveredMessages(ordered, 2, '2')).toEqual([]);
  });

  it('без маркера суммирует весь отброшенный кусок', () => {
    expect(
      selectUncoveredMessages(ordered, 2, null).map((message) => message.id),
    ).toEqual(['1', '2']);
  });
});
