import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

import type { Request } from 'express';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  override getRequest(context: ExecutionContext): Request {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: Request }>().req;
  }

  override handleRequest<TUser>(err: Error | undefined, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}
