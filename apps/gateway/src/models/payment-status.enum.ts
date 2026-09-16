import { registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

registerEnumType(PaymentStatus, { name: 'PaymentStatus' });
