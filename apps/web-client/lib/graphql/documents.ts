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
