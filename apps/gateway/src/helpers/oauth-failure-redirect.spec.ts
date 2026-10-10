import { describe, expect, it } from 'vitest';

import {
  describeErrorForLog,
  parseOauthRedirectUrl,
} from './oauth-failure-redirect';

describe('parseOauthRedirectUrl', () => {
  it('принимает абсолютный http URL', () => {
    expect(
      parseOauthRedirectUrl('http://localhost:4000/auth/callback')?.href,
    ).toBe('http://localhost:4000/auth/callback');
  });

  it('обрезает пробелы', () => {
    expect(
      parseOauthRedirectUrl('  http://localhost:4000/auth/callback  ')?.origin,
    ).toBe('http://localhost:4000');
  });

  it('отклоняет относительный путь', () => {
    expect(parseOauthRedirectUrl('/auth/callback')).toBeUndefined();
  });

  it('отклоняет пустое значение', () => {
    expect(parseOauthRedirectUrl('   ')).toBeUndefined();
    expect(parseOauthRedirectUrl(undefined)).toBeUndefined();
  });
});

describe('describeErrorForLog', () => {
  it('пишет имя и сообщение без стека', () => {
    expect(
      describeErrorForLog(new Error('Failed to obtain access token')),
    ).toBe('Error: Failed to obtain access token');
  });

  it('добавляет только код и описание провайдера', () => {
    const error = new Error('Failed to obtain access token');
    Object.assign(error, {
      oauthError: {
        statusCode: 400,
        data: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Bad Request',
          access_token: 'secret-token',
        }),
      },
    });

    expect(describeErrorForLog(error)).toBe(
      'Error: Failed to obtain access token (invalid_grant: Bad Request)',
    );
  });

  it('не разбирает не-JSON тело', () => {
    const error = new Error('Failed to fetch user profile');
    Object.assign(error, { oauthError: { data: '<html>secret</html>' } });

    expect(describeErrorForLog(error)).toBe(
      'Error: Failed to fetch user profile',
    );
  });
});
