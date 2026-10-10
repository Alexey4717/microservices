import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type VideosQueryVariables = Types.Exact<{ [key: string]: never }>;

export type VideosQuery = {
  __typename?: 'Query';
  videos: Array<{
    __typename?: 'Video';
    id: string;
    title: string;
    url: string;
    author: {
      __typename?: 'VideoAuthor';
      id: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }>;
};

export const VideosDocument = gql`
  query Videos {
    videos {
      id
      title
      url
      author {
        id
        name
        avatarUrl
      }
    }
  }
` as unknown as DocumentNode<VideosQuery, VideosQueryVariables>;
