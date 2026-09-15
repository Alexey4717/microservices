import { ConfigService } from '@nestjs/config';

const DEFAULT_WEB_ORIGIN = 'http://localhost:4000';

export function getOauthFailureRedirect(configService: ConfigService): string {
  const successRedirect = configService.get<string>(
    'OAUTH_SUCCESS_REDIRECT_URL',
  );
  const corsOrigin =
    configService.get<string>('CORS_ORIGIN') ?? DEFAULT_WEB_ORIGIN;
  const origin =
    originFromUrl(successRedirect) ??
    originFromUrl(corsOrigin) ??
    DEFAULT_WEB_ORIGIN;

  return `${origin}/login?error=oauth`;
}

function originFromUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
