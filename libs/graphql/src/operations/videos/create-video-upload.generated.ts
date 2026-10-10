import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type CreateVideoUploadMutationVariables = Types.Exact<{
  input: Types.CreateVideoUploadInput;
}>;

export type CreateVideoUploadMutation = {
  __typename?: 'Mutation';
  createVideoUpload: {
    __typename?: 'VideoUpload';
    videoId: string;
    uploadUrl: string;
  };
};

export const CreateVideoUploadDocument = gql`
  mutation CreateVideoUpload($input: CreateVideoUploadInput!) {
    createVideoUpload(input: $input) {
      videoId
      uploadUrl
    }
  }
` as unknown as DocumentNode<
  CreateVideoUploadMutation,
  CreateVideoUploadMutationVariables
>;
