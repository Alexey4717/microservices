import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/ai-assistant-client';
import {
  PendingActionStatus,
  PendingActionType,
} from '@prisma/ai-assistant-client';

import { PrismaService } from './prisma.service';
import {
  checkoutTitle,
  navigationTitle,
  parseProposeCheckout,
  parseProposeNavigation,
  parseProposeUpdateName,
  updateNameTitle,
} from './propose-actions';
import {
  PROPOSE_CHECKOUT_TOOL,
  PROPOSE_NAVIGATION_TOOL,
  PROPOSE_UPDATE_NAME_TOOL,
} from './tool-definitions';
import type { AssistantTool, ToolEffect, ToolSession } from './tool-types';

@Injectable()
export class ProposeCheckoutTool implements AssistantTool {
  readonly name = PROPOSE_CHECKOUT_TOOL.name;
  readonly description = PROPOSE_CHECKOUT_TOOL.description;
  readonly parameters = PROPOSE_CHECKOUT_TOOL.parameters;

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: unknown, session: ToolSession): Promise<ToolEffect> {
    const parsed = parseProposeCheckout(args);
    if (!parsed.ok) {
      return { content: parsed.error };
    }
    if (!session.conversationId) {
      return { content: 'Не удалось предложить оплату: нет диалога' };
    }

    const title = checkoutTitle(parsed.provider, parsed.productCode);
    const existing = await findPendingByThread(
      this.prisma,
      session,
      PendingActionType.checkout,
    );
    if (existing) {
      return {
        content: `Предложение оплаты создано и ждёт кнопку пользователя. id=${existing.id}. Платёж ещё не создан.`,
        action: { id: existing.id, type: 'checkout', title },
      };
    }

    const action = await this.prisma.pendingAction.create({
      data: {
        conversationId: session.conversationId,
        userId: session.userId,
        type: PendingActionType.checkout,
        status: PendingActionStatus.pending,
        threadId: session.threadId ?? null,
        payload: {
          provider: parsed.provider,
          productCode: parsed.productCode,
          title,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      content: `Предложение оплаты создано и ждёт кнопку пользователя. id=${action.id}. Платёж ещё не создан.`,
      action: { id: action.id, type: 'checkout', title },
    };
  }
}

@Injectable()
export class ProposeNavigationTool implements AssistantTool {
  readonly name = PROPOSE_NAVIGATION_TOOL.name;
  readonly description = PROPOSE_NAVIGATION_TOOL.description;
  readonly parameters = PROPOSE_NAVIGATION_TOOL.parameters;

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: unknown, session: ToolSession): Promise<ToolEffect> {
    const parsed = parseProposeNavigation(args);
    if (!parsed.ok) {
      return { content: parsed.error };
    }
    if (!session.conversationId) {
      return { content: 'Не удалось предложить переход: нет диалога' };
    }

    const title = navigationTitle(parsed.path);
    const existing = await findPendingByThread(
      this.prisma,
      session,
      PendingActionType.navigate,
    );
    if (existing) {
      return {
        content: `Предложение перехода создано и ждёт кнопку пользователя. id=${existing.id}. Переход ещё не выполнен.`,
        action: { id: existing.id, type: 'navigate', title },
      };
    }

    const action = await this.prisma.pendingAction.create({
      data: {
        conversationId: session.conversationId,
        userId: session.userId,
        type: PendingActionType.navigate,
        status: PendingActionStatus.pending,
        threadId: session.threadId ?? null,
        payload: {
          path: parsed.path,
          title,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      content: `Предложение перехода создано и ждёт кнопку пользователя. id=${action.id}. Переход ещё не выполнен.`,
      action: { id: action.id, type: 'navigate', title },
    };
  }
}

@Injectable()
export class ProposeUpdateNameTool implements AssistantTool {
  readonly name = PROPOSE_UPDATE_NAME_TOOL.name;
  readonly description = PROPOSE_UPDATE_NAME_TOOL.description;
  readonly parameters = PROPOSE_UPDATE_NAME_TOOL.parameters;

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: unknown, session: ToolSession): Promise<ToolEffect> {
    const parsed = parseProposeUpdateName(args);
    if (!parsed.ok) {
      return { content: parsed.error };
    }
    if (!session.conversationId) {
      return { content: 'Не удалось предложить смену имени: нет диалога' };
    }

    const title = updateNameTitle(parsed.name);
    const existing = await findPendingByThread(
      this.prisma,
      session,
      PendingActionType.update_name,
    );
    if (existing) {
      return {
        content: `Предложение смены имени создано и ждёт кнопку пользователя. id=${existing.id}. Имя ещё не изменено.`,
        action: { id: existing.id, type: 'update_name', title },
      };
    }

    const action = await this.prisma.pendingAction.create({
      data: {
        conversationId: session.conversationId,
        userId: session.userId,
        type: PendingActionType.update_name,
        status: PendingActionStatus.pending,
        threadId: session.threadId ?? null,
        payload: {
          name: parsed.name,
          title,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      content: `Предложение смены имени создано и ждёт кнопку пользователя. id=${action.id}. Имя ещё не изменено.`,
      action: { id: action.id, type: 'update_name', title },
    };
  }
}

async function findPendingByThread(
  prisma: PrismaService,
  session: ToolSession,
  type: PendingActionType,
) {
  const threadId = session.threadId?.trim();
  if (!threadId || !session.conversationId) {
    return null;
  }
  return prisma.pendingAction.findFirst({
    where: {
      conversationId: session.conversationId,
      userId: session.userId,
      threadId,
      type,
      status: PendingActionStatus.pending,
    },
    orderBy: { createdAt: 'asc' },
  });
}
