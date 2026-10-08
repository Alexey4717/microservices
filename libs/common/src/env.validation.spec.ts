import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import {
  validateAiAssistantEnv,
  validateFilesEnv,
  validateGatewayEnv,
} from './env.validation';

const validFilesEnv = {
  FILES_DATABASE_URL: 'postgresql://localhost:5432/files',
  FILES_GRPC_URL: '127.0.0.1:50052',
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_PUBLIC_BASE_URL: 'http://127.0.0.1:9000/files',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'files',
  S3_ACCESS_KEY: 'access',
  S3_SECRET_KEY: 'secret',
  INTERNAL_SERVICE_TOKEN: 'token',
};

describe('validateFilesEnv', () => {
  it('приводит FILES_PORT из строки к числу', () => {
    const result = validateFilesEnv({
      ...validFilesEnv,
      FILES_PORT: '3002',
    });

    expect(result.FILES_PORT).toBe(3002);
  });
});

const validGatewayEnv = {
  JWT_SECRET: 'secret',
  JWT_ACCESS_TTL: '15m',
  USERS_GRPC_URL: '127.0.0.1:50051',
  FILES_GRPC_URL: '127.0.0.1:50052',
  PAYMENTS_GRPC_URL: '127.0.0.1:50053',
  AI_ASSISTANT_GRPC_URL: '127.0.0.1:50054',
  GATEWAY_DATABASE_URL: 'postgresql://localhost:5432/gateway',
  RABBITMQ_URL: 'amqp://localhost',
  INTERNAL_SERVICE_TOKEN: 'token',
};

describe('validateGatewayEnv', () => {
  it('принимает AI_ASSISTANT_GRPC_URL', () => {
    expect(() => validateGatewayEnv(validGatewayEnv)).not.toThrow();
  });

  it('требует AI_ASSISTANT_GRPC_URL', () => {
    const { AI_ASSISTANT_GRPC_URL: _ignored, ...withoutAssistant } =
      validGatewayEnv;

    expect(() => validateGatewayEnv(withoutAssistant)).toThrow(
      /AI_ASSISTANT_GRPC_URL/,
    );
  });
});

const validAiAssistantEnv = {
  AI_ASSISTANT_DATABASE_URL: 'postgresql://localhost:5432/ai_assistant',
  AI_ASSISTANT_GRPC_URL: '127.0.0.1:50054',
  LLM_BASE_URL: 'http://127.0.0.1:11434/v1',
  LLM_API_KEY: 'ollama',
  LLM_MODEL: 'gemma4:12b',
  LLM_CONTEXT_TOKENS: '8192',
  LLM_MAX_OUTPUT_TOKENS: '1024',
  AI_ASSISTANT_DAILY_TOKEN_LIMIT: '0',
  USERS_GRPC_URL: '127.0.0.1:50051',
  PAYMENTS_GRPC_URL: '127.0.0.1:50053',
  INTERNAL_SERVICE_TOKEN: 'token',
};

describe('validateAiAssistantEnv', () => {
  it('приводит лимит и размеры контекста из строк к числам', () => {
    const result = validateAiAssistantEnv(validAiAssistantEnv);

    expect(result.LLM_CONTEXT_TOKENS).toBe(8192);
    expect(result.LLM_MAX_OUTPUT_TOKENS).toBe(1024);
    expect(result.AI_ASSISTANT_DAILY_TOKEN_LIMIT).toBe(0);
    expect(result.LLM_TEMPERATURE).toBe(0.2);
    expect(result.LLM_EMBED_MODEL).toBe('nomic-embed-text');
    expect(result.LLM_EMBED_DIMENSIONS).toBe(768);
  });

  it('отклоняет конфиг без модели', () => {
    const { LLM_MODEL: _ignored, ...withoutModel } = validAiAssistantEnv;

    expect(() => validateAiAssistantEnv(withoutModel)).toThrow(/LLM_MODEL/);
  });
});
