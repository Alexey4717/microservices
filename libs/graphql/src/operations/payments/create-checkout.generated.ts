import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type CreateCheckoutMutationVariables = Types.Exact<{
  input: Types.CreateCheckoutInput;
}>;

export type CreateCheckoutMutation = {
  __typename?: 'Mutation';
  createCheckout: {
    __typename?: 'CheckoutPayload';
    paymentId: string;
    checkoutUrl: string;
    provider: Types.PaymentProvider;
    status: Types.PaymentStatus;
  };
};

export const CreateCheckoutDocument = gql`
  mutation CreateCheckout($input: CreateCheckoutInput!) {
    createCheckout(input: $input) {
      paymentId
      checkoutUrl
      provider
      status
    }
  }
` as unknown as DocumentNode<
  CreateCheckoutMutation,
  CreateCheckoutMutationVariables
>;
