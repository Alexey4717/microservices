import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type CreateTelegramLinkMutationVariables = Types.Exact<{
  [key: string]: never;
}>;

export type CreateTelegramLinkMutation = {
  __typename?: 'Mutation';
  createTelegramLink: { __typename?: 'TelegramLink'; url: string };
};

export const CreateTelegramLinkDocument = gql`
  mutation CreateTelegramLink {
    createTelegramLink {
      url
    }
  }
` as unknown as DocumentNode<
  CreateTelegramLinkMutation,
  CreateTelegramLinkMutationVariables
>;
