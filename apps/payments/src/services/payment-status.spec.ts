import { describe, expect, it } from 'vitest';

import { PAYMENT_STATUSES } from './payment-constants';
import { canTransition, nextPaymentStatus } from './payment-status';

describe('payment status machine', () => {
  it('разрешает PENDING → SUCCEEDED / FAILED / CANCELED', () => {
    expect(
      canTransition(PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.SUCCEEDED),
    ).toBe(true);
    expect(
      canTransition(PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.FAILED),
    ).toBe(true);
    expect(
      canTransition(PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.CANCELED),
    ).toBe(true);
  });

  it('не разрешает переходы из терминальных статусов', () => {
    expect(
      canTransition(PAYMENT_STATUSES.SUCCEEDED, PAYMENT_STATUSES.FAILED),
    ).toBe(false);
    expect(
      canTransition(PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.SUCCEEDED),
    ).toBe(false);
    expect(
      canTransition(PAYMENT_STATUSES.CANCELED, PAYMENT_STATUSES.PENDING),
    ).toBe(false);
  });

  it('не считает переход в тот же статус изменением', () => {
    expect(
      canTransition(PAYMENT_STATUSES.SUCCEEDED, PAYMENT_STATUSES.SUCCEEDED),
    ).toBe(false);
    expect(
      nextPaymentStatus(PAYMENT_STATUSES.SUCCEEDED, PAYMENT_STATUSES.SUCCEEDED),
    ).toBeNull();
  });

  it('nextPaymentStatus возвращает новый статус только для валидного перехода', () => {
    expect(
      nextPaymentStatus(PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.SUCCEEDED),
    ).toBe(PAYMENT_STATUSES.SUCCEEDED);
    expect(nextPaymentStatus(PAYMENT_STATUSES.PENDING, 'UNKNOWN')).toBeNull();
    expect(nextPaymentStatus('UNKNOWN', PAYMENT_STATUSES.SUCCEEDED)).toBeNull();
  });
});
