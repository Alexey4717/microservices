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
  INTERNAL_SERVICE_TOKEN!: string;

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
