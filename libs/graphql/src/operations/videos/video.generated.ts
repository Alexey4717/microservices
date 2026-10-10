import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type VideoQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;

export type VideoQuery = {
  __typename?: 'Query';
  video: {
    __typename?: 'Video';
    id: string;
    title: string;
    description: string;
    url: string;
    author: {
      __typename?: 'VideoAuthor';
      id: string;
      name: string | null;
      avatarUrl: string | null;
    };
  } | null;
};

export const VideoDocument = gql`
  query Video($id: ID!) {
    video(id: $id) {
      id
      title
      description
      url
      author {
        id
        name
        avatarUrl
      }
    }
  }
` as unknown as DocumentNode<VideoQuery, VideoQueryVariables>;
