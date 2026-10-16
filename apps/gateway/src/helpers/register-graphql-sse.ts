import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLSchemaHost } from '@nestjs/graphql';

import type { NextFunction, Request, Response } from 'express';
import { type DocumentNode, GraphQLError, parse } from 'graphql';
import type { ComplexityEstimator } from 'graphql-query-complexity';
import type {
  Response as GraphqlSseResponse,
  RequestParams,
} from 'graphql-sse';
import { createHandler } from 'graphql-sse/lib/use/express';

import type { GqlContext } from '../types/gql-context';
import {
  assertQueryWithinComplexityLimit,
  calculateQueryComplexity,
  createComplexityEstimators,
  isGraphqlComplexityLimitError,
  readGraphqlMaxComplexity,
  whenComplexityLimitApplies,
} from './graphql-complexity';
import { isGraphqlSseRequest } from './is-graphql-sse-request';

const logger = new Logger('GraphqlSse');

const QUERY_NODE_LIMIT_MESSAGE =
  'Query exceeds the maximum allowed number of nodes.';

/**
 * Nest GraphQL 14 + Apollo 5 поднимают только graphql-ws.
 * graphql-sse (distinct connections) монтируем сами на `/graphql`,
 * до Apollo: запросы с Accept: text/event-stream не уходят в HTTP GraphQL.
 *
 * createHandler.onSubscribe может вернуть HTTP-ответ и остановить выполнение.
 * Так лимит complexity срабатывает до подписки и отдаёт 400 JSON, а не событие SSE.
 */
export function registerGraphqlSse(app: INestApplication): void {
  const estimators = createComplexityEstimators();
  const handler = createHandler({
    authenticate: () => null,
    schema: () => app.get(GraphQLSchemaHost).schema,
    context: (request) =>
      ({
        req: request.raw,
        res: request.context.res,
      }) satisfies GqlContext,
    onSubscribe: (_req, params) =>
      rejectComplexSseOperation(app, params, estimators),
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

function rejectComplexSseOperation(
  app: INestApplication,
  params: RequestParams,
  estimators: ComplexityEstimator[],
): GraphqlSseResponse | undefined {
  if (!params.query) {
    return undefined;
  }

  let document: DocumentNode;
  try {
    document = parse(params.query);
  } catch {
    return undefined;
  }

  const configService = app.get(ConfigService);
  const maxComplexity = readGraphqlMaxComplexity(
    configService.get('GRAPHQL_MAX_COMPLEXITY'),
  );
  const nodeEnv = configService.get<string>('NODE_ENV');

  let complexity: number | undefined;
  try {
    complexity = whenComplexityLimitApplies(params.operationName, nodeEnv, () =>
      calculateQueryComplexity(
        app.get(GraphQLSchemaHost).schema,
        {
          operationName: params.operationName,
          document,
          variables: params.variables,
        },
        estimators,
      ),
    );
  } catch (error) {
    if (isQueryNodeLimitError(error)) {
      logger.warn(
        `operationName=${params.operationName ?? 'anonymous'} complexity=maxQueryNodes max=${maxComplexity}`,
      );
      return graphqlSseErrorResponse(error);
    }
    if (error instanceof GraphQLError) {
      return undefined;
    }
    throw error;
  }

  if (complexity === undefined) {
    return undefined;
  }

  try {
    assertQueryWithinComplexityLimit(complexity, maxComplexity);
  } catch (error) {
    if (!isGraphqlComplexityLimitError(error)) {
      throw error;
    }

    logger.warn(
      `operationName=${params.operationName ?? 'anonymous'} complexity=${complexity} max=${maxComplexity}`,
    );
    return graphqlSseErrorResponse(error);
  }

  return undefined;
}

function isQueryNodeLimitError(error: unknown): error is GraphQLError {
  return (
    error instanceof GraphQLError && error.message === QUERY_NODE_LIMIT_MESSAGE
  );
}

function graphqlSseErrorResponse(error: GraphQLError): GraphqlSseResponse {
  return [
    JSON.stringify({ errors: [error.toJSON()] }),
    {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'content-type': 'application/json; charset=utf-8' },
    },
  ];
}
