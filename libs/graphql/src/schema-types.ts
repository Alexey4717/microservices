export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** The `Upload` scalar type represents a file upload. */
  Upload: { input: File; output: File };
};

export type AccountTier = 'BASE' | 'PREMIUM';

export type AiAssistantReplyModel = {
  __typename?: 'AiAssistantReplyModel';
  conversationId: Scalars['ID']['output'];
  delta: Scalars['String']['output'];
  done: Scalars['Boolean']['output'];
  messageId: Scalars['ID']['output'];
};

export type AiConversationDetailModel = {
  __typename?: 'AiConversationDetailModel';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  messages: Array<AiMessageModel>;
  title: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type AiConversationModel = {
  __typename?: 'AiConversationModel';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  title: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type AiMessageModel = {
  __typename?: 'AiMessageModel';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  toolName: Maybe<Scalars['String']['output']>;
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
  user: UserModel;
};

export type CheckoutPayload = {
  __typename?: 'CheckoutPayload';
  checkoutUrl: Scalars['String']['output'];
  paymentId: Scalars['String']['output'];
  provider: PaymentProvider;
  status: PaymentStatus;
};

export type CreateCheckoutInput = {
  productCode?: InputMaybe<Scalars['String']['input']>;
  provider: PaymentProvider;
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type LogoutInput = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createAiConversation: AiConversationModel;
  createCheckout: CheckoutPayload;
  createTelegramLink: TelegramLink;
  login: AuthPayload;
  loginWithTelegram: AuthPayload;
  logout: Scalars['Boolean']['output'];
  refresh: AuthPayload;
  register: AuthPayload;
  updateMe: UserModel;
  uploadAvatar: UserModel;
};

export type MutationCreateCheckoutArgs = {
  input: CreateCheckoutInput;
};

export type MutationLoginArgs = {
  input: LoginInput;
};

export type MutationLoginWithTelegramArgs = {
  initData: Scalars['String']['input'];
};

export type MutationLogoutArgs = {
  input: InputMaybe<LogoutInput>;
};

export type MutationRefreshArgs = {
  input: InputMaybe<RefreshInput>;
};

export type MutationRegisterArgs = {
  input: RegisterInput;
};

export type MutationUpdateMeArgs = {
  input: UpdateMeInput;
};

export type MutationUploadAvatarArgs = {
  file: Scalars['Upload']['input'];
};

export type PaymentModel = {
  __typename?: 'PaymentModel';
  amountMinor: Scalars['Int']['output'];
  checkoutUrl: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  id: Scalars['String']['output'];
  productCode: Scalars['String']['output'];
  provider: PaymentProvider;
  status: PaymentStatus;
};

export type PaymentProvider = 'PAYPAL' | 'STRIPE';

export type PaymentStatus = 'CANCELED' | 'FAILED' | 'PENDING' | 'SUCCEEDED';

export type Query = {
  __typename?: 'Query';
  aiConversation: AiConversationDetailModel;
  aiConversations: Array<AiConversationModel>;
  me: UserModel;
  myPayments: Array<PaymentModel>;
  payment: PaymentModel;
};

export type QueryAiConversationArgs = {
  id: Scalars['ID']['input'];
};

export type QueryPaymentArgs = {
  id: Scalars['ID']['input'];
};

export type RefreshInput = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  aiAssistantReply: AiAssistantReplyModel;
  telegramLinked: TelegramLinkedPayload;
};

export type SubscriptionAiAssistantReplyArgs = {
  content: Scalars['String']['input'];
  conversationId: Scalars['ID']['input'];
};

export type TelegramLink = {
  __typename?: 'TelegramLink';
  url: Scalars['String']['output'];
};

export type TelegramLinkedPayload = {
  __typename?: 'TelegramLinkedPayload';
  ok: Scalars['Boolean']['output'];
};

export type TelegramProfile = {
  __typename?: 'TelegramProfile';
  firstName: Maybe<Scalars['String']['output']>;
  photoUrl: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
  userLastName: Maybe<Scalars['String']['output']>;
  username: Maybe<Scalars['String']['output']>;
};

export type UpdateMeInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UserModel = {
  __typename?: 'UserModel';
  accountTier: AccountTier;
  avatarUrl: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Maybe<Scalars['String']['output']>;
  telegram: Maybe<TelegramProfile>;
};
