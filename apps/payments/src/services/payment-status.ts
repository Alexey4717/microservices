import {
  PAYMENT_STATUSES,
  type PaymentStatus,
  isPaymentStatus,
} from './payment-constants';

const ALLOWED_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: [
    PAYMENT_STATUSES.SUCCEEDED,
    PAYMENT_STATUSES.FAILED,
    PAYMENT_STATUSES.CANCELED,
  ],
  SUCCEEDED: [],
  FAILED: [],
  CANCELED: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextPaymentStatus(
  current: string,
  incoming: string,
): PaymentStatus | null {
  if (!isPaymentStatus(current) || !isPaymentStatus(incoming)) {
    return null;
  }
  if (!canTransition(current, incoming)) {
    return null;
  }
  return incoming;
}
