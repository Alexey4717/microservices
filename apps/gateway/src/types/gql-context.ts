import type { Request, Response } from 'express';

import type { AuthenticatedUser } from './auth.types';

export interface GqlContext {
  req: Request & { user?: AuthenticatedUser };
  res: Response;
}
