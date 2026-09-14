import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export class UsersEnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL!: string;

  @IsString()
  JWT_REFRESH_TTL!: string;

  @IsString()
  USERS_GRPC_URL!: string;

  @IsString()
  RABBITMQ_URL!: string;

  @IsString()
  INTERNAL_SERVICE_TOKEN!: string;
}

export function validateUsersEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(UsersEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Некорректный .env для users: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }

  return config;
}

export class GatewayEnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL!: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL?: string;

  @IsString()
  USERS_GRPC_URL!: string;

  @IsString()
  FILES_GRPC_URL!: string;

  @IsString()
  GATEWAY_DATABASE_URL!: string;

  @IsString()
  RABBITMQ_URL!: string;

  @IsString()
  INTERNAL_SERVICE_TOKEN!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  OAUTH_CALLBACK_BASE_URL?: string;

  @IsOptional()
  @IsString()
  OAUTH_SUCCESS_REDIRECT_URL?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  GITHUB_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_CLIENT_SECRET?: string;
}

export function validateGatewayEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(GatewayEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Некорректный .env для gateway: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }

  return config;
}

export class MailerEnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  MAILER_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  MAILER_PORT?: number;

  @IsString()
  RABBITMQ_URL!: string;

  @IsOptional()
  @IsString()
  NODEMAILER_USER_TRANSPORT?: string;

  @IsOptional()
  @IsString()
  NODEMAILER_PASSWORD_TRANSPORT?: string;

  @IsOptional()
  @IsString()
  NODEMAILER_FROM?: string;
}

function blankToUndefined(
  config: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const next = { ...config };
  for (const key of keys) {
    const value = next[key];
    if (typeof value === 'string' && value.trim() === '') {
      next[key] = undefined;
    }
  }
  return next;
}

export function validateMailerEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = blankToUndefined(config, [
    'MAILER_HOST',
    'NODEMAILER_USER_TRANSPORT',
    'NODEMAILER_PASSWORD_TRANSPORT',
    'NODEMAILER_FROM',
  ]);
  const validated = plainToInstance(MailerEnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Некорректный .env для mailer: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }

  return normalized;
}

export class FilesEnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsString()
  FILES_DATABASE_URL!: string;

  @IsString()
  FILES_GRPC_URL!: string;

  @IsOptional()
  @IsString()
  FILES_HOST?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  FILES_PORT?: number;

  @IsString()
  S3_ENDPOINT!: string;

  @IsString()
  S3_PUBLIC_BASE_URL!: string;

  @IsString()
  S3_REGION!: string;

  @IsString()
  S3_BUCKET!: string;

  @IsString()
  S3_ACCESS_KEY!: string;

  @IsString()
  S3_SECRET_KEY!: string;

  @IsOptional()
  @IsString()
  S3_FORCE_PATH_STYLE?: string;

  @IsString()
  INTERNAL_SERVICE_TOKEN!: string;
}

export function validateFilesEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(FilesEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Некорректный .env для files: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('; ')}`,
    );
  }

  return validated as unknown as Record<string, unknown>;
}
