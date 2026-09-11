export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export type AuthPayload = {
  accessToken: string;
  user: AuthUser;
};

export type GraphQLErrorShape = {
  message: string;
  extensions?: {
    code?: string;
    http?: { status?: number };
  };
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLErrorShape[];
};
