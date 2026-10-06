import { describe, expect, it, vi } from 'vitest';

import type { PaymentResponse } from '@libs/proto';

import { executeListMyPayments, takeLatestPayments } from './payments-tool';
import { EMPTY_TOOL_PARAMETERS } from './tool-types';

function payment(id: string, createdAt: string): PaymentResponse {
  return {
    id,
    userId: 'owner',
    productCode: 'PREMIUM',
    provider: 'STRIPE',
    status: 'SUCCEEDED',
    amountMinor: 999,
    currency: 'USD',
    checkoutUrl: '',
    createdAt,
  };
}

describe('list_my_payments', () => {
  it('берёт user id из сессии и оставляет 20 последних платежей', async () => {
    const payments = Array.from({ length: 25 }, (_, index) =>
      payment(
        `p${index}`,
        new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      ),
    );
    const listPayments = vi.fn().mockResolvedValue(payments);

    const raw = await executeListMyPayments(
      { userId: 'attacker', limit: 1000 },
      { userId: 'owner', internalToken: 'token' },
      listPayments,
    );

    expect(listPayments).toHaveBeenCalledWith('owner', 'token');
    const parsed = JSON.parse(raw) as PaymentResponse[];
    expect(parsed).toHaveLength(20);
    expect(parsed[0]?.id).toBe('p24');
    expect(parsed.at(-1)?.id).toBe('p5');
    expect(takeLatestPayments(payments)).toHaveLength(20);
    expect(JSON.stringify(EMPTY_TOOL_PARAMETERS)).not.toContain('userId');
  });
});
