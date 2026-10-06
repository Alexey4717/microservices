import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type MyPaymentsQueryVariables = Types.Exact<{ [key: string]: never }>;

export type MyPaymentsQuery = {
  __typename?: 'Query';
  myPayments: Array<{
    __typename?: 'PaymentModel';
    id: string;
    productCode: string;
    provider: Types.PaymentProvider;
    status: Types.PaymentStatus;
    amountMinor: number;
    currency: string;
    checkoutUrl: string | null;
    createdAt: string;
  }>;
};

export const MyPaymentsDocument = gql`
  query MyPayments {
    myPayments {
      id
      productCode
      provider
      status
      amountMinor
      currency
      checkoutUrl
      createdAt
    }
  }
` as unknown as DocumentNode<MyPaymentsQuery, MyPaymentsQueryVariables>;
