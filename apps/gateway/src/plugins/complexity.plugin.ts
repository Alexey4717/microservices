import { Plugin } from '@nestjs/apollo';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLSchemaHost } from '@nestjs/graphql';

import type {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestListener,
} from '@apollo/server';

import {
  assertQueryWithinComplexityLimit,
  calculateQueryComplexity,
  createComplexityEstimators,
  isGraphqlComplexityLimitError,
  readGraphqlMaxComplexity,
  whenComplexityLimitApplies,
} from '../helpers/graphql-complexity';

@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin<BaseContext> {
  private readonly logger = new Logger(ComplexityPlugin.name);
  private readonly estimators = createComplexityEstimators();

  constructor(
    private readonly gqlSchemaHost: GraphQLSchemaHost,
    private readonly configService: ConfigService,
  ) {}

  requestDidStart(): Promise<GraphQLRequestListener<BaseContext>> {
    const maxComplexity = readGraphqlMaxComplexity(
      this.configService.get('GRAPHQL_MAX_COMPLEXITY'),
    );
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const { schema } = this.gqlSchemaHost;
    const estimators = this.estimators;
    const logger = this.logger;
    const exposeComplexity = nodeEnv !== 'production';
    let lastComplexity: number | undefined;

    return Promise.resolve({
      didResolveOperation({ request, document }) {
        const complexity = whenComplexityLimitApplies(
          request.operationName,
          nodeEnv,
          () =>
            calculateQueryComplexity(
              schema,
              {
                operationName: request.operationName,
                document,
                variables: request.variables,
              },
              estimators,
            ),
        );

        if (complexity === undefined) {
          return Promise.resolve();
        }

        lastComplexity = complexity;

        try {
          assertQueryWithinComplexityLimit(complexity, maxComplexity);
        } catch (error) {
          if (isGraphqlComplexityLimitError(error)) {
            logger.warn(
              `operationName=${request.operationName ?? 'anonymous'} complexity=${complexity} max=${maxComplexity}`,
            );
          }
          throw error;
        }

        return Promise.resolve();
      },

      willSendResponse(requestContext) {
        if (!exposeComplexity || lastComplexity === undefined) {
          return Promise.resolve();
        }

        const { body } = requestContext.response;
        if (body.kind !== 'single' || body.singleResult.errors?.length) {
          return Promise.resolve();
        }

        body.singleResult.extensions = {
          ...body.singleResult.extensions,
          complexity: lastComplexity,
          maxComplexity,
        };
        return Promise.resolve();
      },
    });
  }
}
