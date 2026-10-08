import { Injectable } from '@nestjs/common';

import type { PaymentResponse } from '@libs/proto';

import { PaymentsGrpcService } from './payments-grpc.service';
import { LIST_MY_PAYMENTS_TOOL } from './tool-definitions';
import { type AssistantTool, type ToolSession } from './tool-types';

export const PAYMENTS_TOOL_LIMIT = 20;

export function takeLatestPayments<T extends { createdAt: string }>(
  payments: readonly T[],
  limit = PAYMENTS_TOOL_LIMIT,
): T[] {
  return [...payments]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function executeListMyPayments(
  _args: unknown,
  session: ToolSession,
  listPayments: (
    userId: string,
    internalToken: string,
  ) => Promise<PaymentResponse[]>,
): Promise<string> {
  const payments = await listPayments(session.userId, session.internalToken);
  return JSON.stringify(takeLatestPayments(payments));
}

@Injectable()
export class PaymentsTool implements AssistantTool {
  readonly name = LIST_MY_PAYMENTS_TOOL.name;
  readonly description = LIST_MY_PAYMENTS_TOOL.description;
  readonly parameters = LIST_MY_PAYMENTS_TOOL.parameters;

  constructor(private readonly payments: PaymentsGrpcService) {}

  execute(args: unknown, session: ToolSession): Promise<string> {
    return executeListMyPayments(args, session, (userId, internalToken) =>
      this.payments.listMyPayments(userId, internalToken),
    );
  }
}
