import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';

import type { NextFunction, Request, Response } from 'express';
import { createHandler } from 'graphql-sse/lib/use/express';

import type { GqlContext } from '../types/gql-context';
import { isGraphqlSseRequest } from './is-graphql-sse-request';

const logger = new Logger('GraphqlSse');

/**
 * Nest GraphQL 14 + Apollo 5 поднимают только graphql-ws.
 * graphql-sse (distinct connections) монтируем сами на `/graphql`,
 * до Apollo: запросы с Accept: text/event-stream не уходят в HTTP GraphQL.
 */
export function registerGraphqlSse(app: INestApplication): void {
  const handler = createHandler({
    authenticate: () => null,
    schema: () => app.get(GraphQLSchemaHost).schema,
    context: (request) =>
      ({
        req: request.raw,
        res: request.context.res,
      }) satisfies GqlContext,
  });

  app.use('/graphql', (req: Request, res: Response, next: NextFunction) => {
    if (!isGraphqlSseRequest(req)) {
      next();
      return;
    }

    void handler(req, res).catch((error: unknown) => {
      logger.error(
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
  });
}
