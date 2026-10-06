import { describe, expect, it } from 'vitest';

import {
  type BudgetMessage,
  fitPrompt,
  isOverDailyTokenLimit,
} from './token-budget.service';

const systemPrompt = 'СИСТЕМНЫЙ_ПРОМПТ_НЕ_РЕЗАТЬ';

describe('fitPrompt', () => {
  it('отрезает старую историю и оставляет системный промпт целиком', () => {
    const old = 'а'.repeat(4000);
    const recent = 'свежий вопрос';
    const history: BudgetMessage[] = [
      { role: 'user', content: old },
      { role: 'assistant', content: old },
      { role: 'user', content: recent },
    ];

    const result = fitPrompt({
      systemPrompt,
      toolSchemaText: '',
      retrievalText: '',
      history,
      contextTokens: 500,
      maxOutputTokens: 100,
    });

    expect(result.overflow).toBe(false);
    expect(result.messages[0]).toEqual({
      role: 'system',
      content: systemPrompt,
    });
    expect(result.messages[0].content.length).toBe(systemPrompt.length);
    expect(result.messages.some((message) => message.content === old)).toBe(
      false,
    );
    expect(result.messages.some((message) => message.content === recent)).toBe(
      true,
    );
    expect(result.droppedCount).toBe(2);
  });

  it('не режет системный промпт, если он сам не входит в бюджет', () => {
    const hugeSystem = 'S'.repeat(2000);
    const result = fitPrompt({
      systemPrompt: hugeSystem,
      toolSchemaText: '',
      retrievalText: '',
      history: [{ role: 'user', content: 'привет' }],
      contextTokens: 200,
      maxOutputTokens: 50,
    });

    expect(result.overflow).toBe(true);
    expect(result.messages[0].content).toBe(hugeSystem);
    expect(result.messages[0].content.length).toBe(hugeSystem.length);
  });
});

describe('isOverDailyTokenLimit', () => {
  it('не ограничивает, когда лимит равен 0', () => {
    expect(isOverDailyTokenLimit(1_000_000, 0)).toBe(false);
  });

  it('срабатывает на границе положительного лимита', () => {
    expect(isOverDailyTokenLimit(99, 100)).toBe(false);
    expect(isOverDailyTokenLimit(100, 100)).toBe(true);
  });
});
