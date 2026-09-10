declare module 'passport-jwt' {
  import type { Request } from 'express';

  export type JwtFromRequestFunction = (req: Request) => string | null;

  export interface StrategyOptions {
    secretOrKey: string | Buffer;
    jwtFromRequest: JwtFromRequestFunction;
    ignoreExpiration?: boolean;
    algorithms?: string[];
    issuer?: string;
    audience?: string;
    passReqToCallback?: boolean;
  }

  export class Strategy {
    constructor(options: StrategyOptions);
    name: string;
    authenticate(req: Request, options?: object): void;
  }

  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): JwtFromRequestFunction;
    fromAuthHeaderWithScheme(scheme: string): JwtFromRequestFunction;
    fromUrlQueryParameter(param: string): JwtFromRequestFunction;
  };
}

declare module 'passport-google-oauth20' {
  import type { Request } from 'express';

  export interface Profile {
    id: string;
    displayName: string;
    name?: { familyName?: string; givenName?: string };
    emails?: Array<{ value: string; verified?: boolean }>;
    photos?: Array<{ value: string }>;
    provider: string;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: unknown) => void,
  ) => void;

  export class Strategy {
    constructor(options: StrategyOptions, verify?: VerifyFunction);
    name: string;
    authenticate(req: Request, options?: object): void;
  }
}

declare module 'passport-github2' {
  import type { Request } from 'express';

  export interface Profile {
    id: string;
    displayName: string;
    username?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: unknown) => void,
  ) => void;

  export class Strategy {
    constructor(options: StrategyOptions, verify?: VerifyFunction);
    name: string;
    authenticate(req: Request, options?: object): void;
  }
}
