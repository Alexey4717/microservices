import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { AuthenticatedUser } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: { user: AuthenticatedUser } }>().req.user;
  },
);
