/// <reference types="vitest/globals" />

import {
  buildPackagedCsp,
  withContentSecurityPolicy,
} from './content-security-policy';

describe('buildPackagedCsp', () => {
  it('разрешает connect-src только на origin GraphQL', () => {
    expect(buildPackagedCsp('http://127.0.0.1:3000/graphql')).toBe(
      "default-src 'self'; connect-src 'self' http://127.0.0.1:3000",
    );
  });

  it('без корректного URL оставляет connect-src self', () => {
    expect(buildPackagedCsp('not a url')).toBe(
      "default-src 'self'; connect-src 'self'",
    );
  });
});

describe('withContentSecurityPolicy', () => {
  it('ставит политику и сохраняет остальные заголовки', () => {
    expect(
      withContentSecurityPolicy(
        {
          'Content-Type': ['text/html'],
          'content-security-policy': ['default-src *'],
        },
        "default-src 'self'",
      ),
    ).toEqual({
      'Content-Type': ['text/html'],
      'Content-Security-Policy': ["default-src 'self'"],
    });
  });
});
