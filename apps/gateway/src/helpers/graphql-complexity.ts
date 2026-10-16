import { type DocumentNode, GraphQLError, type GraphQLSchema } from 'graphql';
import {
  type ComplexityEstimator,
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

export const DEFAULT_GRAPHQL_MAX_COMPLEXITY = 100;

export const GRAPHQL_COMPLEXITY_LIMIT_CODE = 'GRAPHQL_COMPLEXITY_LIMIT';

export const INTROSPECTION_OPERATION_NAME = 'IntrospectionQuery';

export type ComplexityQuery = {
  operationName?: string | null;
  document: DocumentNode;
  variables?: Record<string, unknown> | null;
};

export function createComplexityEstimators(): ComplexityEstimator[] {
  return [
    fieldExtensionsEstimator(),
    simpleEstimator({ defaultComplexity: 1 }),
  ];
}

export function readGraphqlMaxComplexity(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_GRAPHQL_MAX_COMPLEXITY;
  }

  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_GRAPHQL_MAX_COMPLEXITY;
  }

  return value;
}

export function calculateQueryComplexity(
  schema: GraphQLSchema,
  request: ComplexityQuery,
  estimators: ComplexityEstimator[] = createComplexityEstimators(),
): number {
  return getComplexity({
    schema,
    query: request.document,
    operationName: request.operationName ?? undefined,
    variables: request.variables ?? undefined,
    estimators,
  });
}

export function assertQueryWithinComplexityLimit(
  complexity: number,
  maxComplexity: number,
): void {
  if (complexity > maxComplexity) {
    throw new GraphQLError(
      `Query is too complex: ${complexity}. Maximum allowed: ${maxComplexity}`,
      {
        extensions: {
          code: GRAPHQL_COMPLEXITY_LIMIT_CODE,
          complexity,
          maxComplexity,
        },
      },
    );
  }
}

export function isGraphqlComplexityLimitError(
  error: unknown,
): error is GraphQLError {
  return (
    error instanceof GraphQLError &&
    error.extensions.code === GRAPHQL_COMPLEXITY_LIMIT_CODE
  );
}

/**
 * GraphiQL грузит схему через IntrospectionQuery (сотни полей).
 * Вне production этот запрос не режется лимитом сложности.
 * В production introspection выключен, но если запрос всё же придёт — лимит действует.
 */
export function shouldSkipComplexityLimit(
  operationName: string | null | undefined,
  nodeEnv: string | undefined,
): boolean {
  return (
    operationName === INTROSPECTION_OPERATION_NAME && nodeEnv !== 'production'
  );
}

/**
 * Считает сложность только если лимит действует.
 * Для IntrospectionQuery вне production расчёт не запускается:
 * graphql-query-complexity бросает ошибку лимита узлов раньше пропуска.
 */
export function whenComplexityLimitApplies(
  operationName: string | null | undefined,
  nodeEnv: string | undefined,
  calculate: () => number,
): number | undefined {
  if (shouldSkipComplexityLimit(operationName, nodeEnv)) {
    return undefined;
  }

  return calculate();
}
