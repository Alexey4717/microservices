import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';
import { UserFieldsFragmentDoc } from './user-fields.generated';

export type UploadAvatarMutationVariables = Types.Exact<{
  file: Types.Scalars['Upload']['input'];
}>;

export type UploadAvatarMutation = {
  __typename?: 'Mutation';
  uploadAvatar: {
    __typename?: 'UserModel';
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    accountTier: Types.AccountTier;
    telegram: {
      __typename?: 'TelegramProfile';
      userId: string;
      username: string | null;
      firstName: string | null;
      userLastName: string | null;
      photoUrl: string | null;
    } | null;
  };
};

export const UploadAvatarDocument = gql`
  mutation UploadAvatar($file: Upload!) {
    uploadAvatar(file: $file) {
      ...UserFields
    }
  }
  ${UserFieldsFragmentDoc}
` as unknown as DocumentNode<
  UploadAvatarMutation,
  UploadAvatarMutationVariables
>;
