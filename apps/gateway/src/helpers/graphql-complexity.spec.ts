import { GraphQLError, buildSchema, parse } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import {
  assertQueryWithinComplexityLimit,
  calculateQueryComplexity,
  createComplexityEstimators,
  shouldSkipComplexityLimit,
  whenComplexityLimitApplies,
} from './graphql-complexity';

const schema = buildSchema(`
  type Query {
    me: User
  }

  type User {
    id: ID
    name: String
    friend: User
  }
`);

describe('graphql complexity', () => {
  const estimators = createComplexityEstimators();

  it('пропускает запрос в пределах лимита', () => {
    const document = parse('query { me { id name } }');
    const complexity = calculateQueryComplexity(
      schema,
      { document },
      estimators,
    );

    expect(complexity).toBe(3);
    expect(() =>
      assertQueryWithinComplexityLimit(complexity, complexity),
    ).not.toThrow();
    expect(() =>
      assertQueryWithinComplexityLimit(complexity, 100),
    ).not.toThrow();
  });

  it('бросает GraphQLError, если запрос дороже лимита', () => {
    const document = parse(`
      query {
        me {
          id
          name
          friend {
            id
            name
          }
        }
      }
    `);
    const complexity = calculateQueryComplexity(
      schema,
      { document },
      estimators,
    );

    expect(complexity).toBe(6);
    expect(() => assertQueryWithinComplexityLimit(complexity, 2)).toThrow(
      GraphQLError,
    );

    try {
      assertQueryWithinComplexityLimit(complexity, 2);
      expect.fail('expected complexity limit error');
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError);
      const gqlError = error as GraphQLError;
      expect(gqlError.message).toBe(
        'Query is too complex: 6. Maximum allowed: 2',
      );
      expect(gqlError.extensions).toMatchObject({
        code: 'GRAPHQL_COMPLEXITY_LIMIT',
        complexity: 6,
        maxComplexity: 2,
      });
    }
  });

  describe('shouldSkipComplexityLimit', () => {
    it('пропускает IntrospectionQuery вне production', () => {
      expect(
        shouldSkipComplexityLimit('IntrospectionQuery', 'development'),
      ).toBe(true);
      expect(shouldSkipComplexityLimit('IntrospectionQuery', 'test')).toBe(
        true,
      );
      expect(shouldSkipComplexityLimit('IntrospectionQuery', undefined)).toBe(
        true,
      );
    });

    it('не пропускает IntrospectionQuery в production', () => {
      expect(
        shouldSkipComplexityLimit('IntrospectionQuery', 'production'),
      ).toBe(false);
    });

    it('не пропускает другие операции', () => {
      expect(shouldSkipComplexityLimit('Me', 'development')).toBe(false);
      expect(shouldSkipComplexityLimit('Me', 'production')).toBe(false);
      expect(shouldSkipComplexityLimit(undefined, 'development')).toBe(false);
      expect(shouldSkipComplexityLimit(null, 'development')).toBe(false);
    });
  });

  describe('whenComplexityLimitApplies', () => {
    it('не считает сложность для IntrospectionQuery вне production', () => {
      const calculate = vi.fn(() => {
        throw new Error('Query exceeds the maximum allowed number of nodes.');
      });

      expect(
        whenComplexityLimitApplies(
          'IntrospectionQuery',
          'development',
          calculate,
        ),
      ).toBeUndefined();
      expect(
        whenComplexityLimitApplies('IntrospectionQuery', undefined, calculate),
      ).toBeUndefined();
      expect(calculate).not.toHaveBeenCalled();
    });

    it('считает сложность, когда лимит действует, и пробрасывает ошибку расчёта', () => {
      const calculate = vi.fn(() => 4);

      expect(whenComplexityLimitApplies('Me', 'development', calculate)).toBe(
        4,
      );
      expect(
        whenComplexityLimitApplies(
          'IntrospectionQuery',
          'production',
          calculate,
        ),
      ).toBe(4);
      expect(calculate).toHaveBeenCalledTimes(2);

      expect(() =>
        whenComplexityLimitApplies('Me', 'development', () => {
          throw new Error('Query exceeds the maximum allowed number of nodes.');
        }),
      ).toThrow('Query exceeds the maximum allowed number of nodes.');
    });
  });
});
