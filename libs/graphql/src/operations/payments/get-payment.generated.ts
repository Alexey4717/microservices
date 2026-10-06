import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type GetPaymentQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;

export type GetPaymentQuery = {
  __typename?: 'Query';
  payment: {
    __typename?: 'PaymentModel';
    id: string;
    productCode: string;
    provider: Types.PaymentProvider;
    status: Types.PaymentStatus;
    amountMinor: number;
    currency: string;
    checkoutUrl: string | null;
    createdAt: string;
  };
};

export const GetPaymentDocument = gql`
  query GetPayment($id: ID!) {
    payment(id: $id) {
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
` as unknown as DocumentNode<GetPaymentQuery, GetPaymentQueryVariables>;
