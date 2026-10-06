import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type TelegramLinkedSubscriptionVariables = Types.Exact<{
  [key: string]: never;
}>;

export type TelegramLinkedSubscription = {
  __typename?: 'Subscription';
  telegramLinked: { __typename?: 'TelegramLinkedPayload'; ok: boolean };
};

export const TelegramLinkedDocument = gql`
  subscription TelegramLinked {
    telegramLinked {
      ok
    }
  }
` as unknown as DocumentNode<
  TelegramLinkedSubscription,
  TelegramLinkedSubscriptionVariables
>;
