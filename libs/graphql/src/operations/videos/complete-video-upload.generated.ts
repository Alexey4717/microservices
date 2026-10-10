import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type CompleteVideoUploadMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;

export type CompleteVideoUploadMutation = {
  __typename?: 'Mutation';
  completeVideoUpload: { __typename?: 'Video'; id: string };
};

export const CompleteVideoUploadDocument = gql`
  mutation CompleteVideoUpload($id: ID!) {
    completeVideoUpload(id: $id) {
      id
    }
  }
` as unknown as DocumentNode<
  CompleteVideoUploadMutation,
  CompleteVideoUploadMutationVariables
>;
