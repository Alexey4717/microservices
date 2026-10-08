import { EMPTY_TOOL_PARAMETERS } from './tool-types';

const checkoutParameters = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      enum: ['STRIPE', 'PAYPAL'],
      description: 'Провайдер оплаты',
    },
    productCode: {
      type: 'string',
      description: 'Код продукта. Если не указан, сервер подставляет PREMIUM.',
    },
  },
  required: ['provider'],
  additionalProperties: false,
};

const navigationParameters = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      enum: ['/', '/profile', '/payments', '/videos', '/ai-assistant'],
      description: 'Путь внутри приложения',
    },
  },
  required: ['path'],
  additionalProperties: false,
};

const updateNameParameters = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Новое имя профиля. Пустое имя недопустимо.',
    },
  },
  required: ['name'],
  additionalProperties: false,
};

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const GET_MY_PROFILE_TOOL: ToolDefinition = {
  name: 'get_my_profile',
  description:
    'Профиль текущего пользователя сессии. Аргументы не принимаются: user id из текста модели игнорируется.',
  parameters: EMPTY_TOOL_PARAMETERS,
};

export const LIST_MY_PAYMENTS_TOOL: ToolDefinition = {
  name: 'list_my_payments',
  description:
    'Платежи текущего пользователя сессии, не больше 20 последних. Аргументы не принимаются: user id из текста модели игнорируется.',
  parameters: EMPTY_TOOL_PARAMETERS,
};

export const PROPOSE_CHECKOUT_TOOL: ToolDefinition = {
  name: 'propose_checkout',
  description:
    'Предложить оплату. Создаёт карточку с кнопкой и не вызывает платёж, пока пользователь не подтвердит. provider: STRIPE или PAYPAL. productCode по умолчанию PREMIUM.',
  parameters: checkoutParameters,
};

export const PROPOSE_NAVIGATION_TOOL: ToolDefinition = {
  name: 'propose_navigation',
  description:
    'Предложить переход по приложению. Допустимы только пути /, /profile, /payments, /videos, /ai-assistant. Переход выполняет клиент после кнопки подтверждения.',
  parameters: navigationParameters,
};

export const PROPOSE_UPDATE_NAME_TOOL: ToolDefinition = {
  name: 'propose_update_name',
  description:
    'Предложить смену имени профиля. Имя берётся из просьбы пользователя и не должно быть пустым. Имя меняется только после кнопки подтверждения.',
  parameters: updateNameParameters,
};

export const ASSISTANT_TOOL_DEFINITIONS: ToolDefinition[] = [
  GET_MY_PROFILE_TOOL,
  LIST_MY_PAYMENTS_TOOL,
  PROPOSE_CHECKOUT_TOOL,
  PROPOSE_NAVIGATION_TOOL,
  PROPOSE_UPDATE_NAME_TOOL,
];
