import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        name
        avatarUrl
        accountTier
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        email
        name
        avatarUrl
        accountTier
      }
    }
  }
`;

export const REFRESH_MUTATION = gql`
  mutation Refresh($input: RefreshInput) {
    refresh(input: $input) {
      accessToken
      user {
        id
        email
        name
        avatarUrl
        accountTier
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout($input: LogoutInput) {
    logout(input: $input)
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      avatarUrl
      accountTier
      telegram {
        userId
        username
        firstName
        userLastName
        photoUrl
      }
    }
  }
`;

export const UPLOAD_AVATAR_MUTATION = gql`
  mutation UploadAvatar($file: Upload!) {
    uploadAvatar(file: $file) {
      id
      email
      name
      avatarUrl
      accountTier
    }
  }
`;

export const CREATE_TELEGRAM_LINK_MUTATION = gql`
  mutation CreateTelegramLink {
    createTelegramLink {
      url
    }
  }
`;

export const TELEGRAM_LINKED_SUBSCRIPTION = gql`
  subscription TelegramLinked {
    telegramLinked {
      ok
    }
  }
`;

export const CREATE_CHECKOUT_MUTATION = gql`
  mutation CreateCheckout($input: CreateCheckoutInput!) {
    createCheckout(input: $input) {
      paymentId
      checkoutUrl
      provider
      status
    }
  }
`;

export const MY_PAYMENTS_QUERY = gql`
  query MyPayments {
    myPayments {
      id
      productCode
      provider
      status
      amountMinor
      currency
      checkoutUrl
      createdAt
    }
  }
`;

export const AI_CONVERSATIONS_QUERY = gql`
  query AiConversations {
    aiConversations {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

export const AI_CONVERSATION_QUERY = gql`
  query AiConversation($id: ID!) {
    aiConversation(id: $id) {
      id
      title
      createdAt
      updatedAt
      messages {
        id
        role
        content
        toolName
        createdAt
      }
    }
  }
`;

export const CREATE_AI_CONVERSATION_MUTATION = gql`
  mutation CreateAiConversation {
    createAiConversation {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

export const AI_ASSISTANT_REPLY_SUBSCRIPTION = gql`
  subscription AiAssistantReply($conversationId: ID!, $content: String!) {
    aiAssistantReply(conversationId: $conversationId, content: $content) {
      conversationId
      messageId
      delta
      done
    }
  }
`;

export const GET_PAYMENT_QUERY = gql`
  query GetPayment($id: ID!) {
    payment(id: $id) {
      id
      productCode
      provider
      status
      amountMinor
      currency
      checkoutUrl
      createdAt
    }
  }
`;
