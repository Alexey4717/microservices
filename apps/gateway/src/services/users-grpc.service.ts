import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { type CallOptions, Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom, timeout } from 'rxjs';

import {
  USERS_GRPC_CLIENT,
  createInternalMetadata,
  isUsersTransportError,
  mapRpcToGraphqlError,
  mapRpcToHttpException,
} from '@libs/common';
import { AUTH_SERVICE_NAME } from '@libs/proto';
import type {
  AuthResponse,
  Empty,
  GetMeRequest,
  LoginRequest,
  LogoutRequest,
  OauthUpsertRequest,
  RefreshRequest,
  RegisterRequest,
  UserResponse,
} from '@libs/proto';

const USERS_READ_TIMEOUT_MS = 2000;

interface AuthGrpcClient {
  register(data: RegisterRequest, metadata: Metadata): Observable<AuthResponse>;
  login(data: LoginRequest, metadata: Metadata): Observable<AuthResponse>;
  oauthUpsert(
    data: OauthUpsertRequest,
    metadata: Metadata,
  ): Observable<AuthResponse>;
  refresh(data: RefreshRequest, metadata: Metadata): Observable<AuthResponse>;
  logout(data: LogoutRequest, metadata: Metadata): Observable<Empty>;
  getMe(
    data: GetMeRequest,
    metadata: Metadata,
    options?: CallOptions,
  ): Observable<UserResponse>;
}

@Injectable()
export class UsersGrpcService implements OnModuleInit {
  private auth!: AuthGrpcClient;

  constructor(@Inject(USERS_GRPC_CLIENT) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.auth = this.client.getService<AuthGrpcClient>(AUTH_SERVICE_NAME);
  }

  register(
    data: RegisterRequest,
    internalToken: string,
  ): Promise<AuthResponse> {
    return this.callGraphql(() =>
      this.auth.register(data, createInternalMetadata(internalToken)),
    );
  }

  login(data: LoginRequest, internalToken: string): Promise<AuthResponse> {
    return this.callGraphql(() =>
      this.auth.login(data, createInternalMetadata(internalToken)),
    );
  }

  oauthUpsert(
    data: OauthUpsertRequest,
    internalToken: string,
  ): Promise<AuthResponse> {
    return this.callHttp(() =>
      this.auth.oauthUpsert(data, createInternalMetadata(internalToken)),
    );
  }

  refresh(data: RefreshRequest, internalToken: string): Promise<AuthResponse> {
    return this.callGraphql(() =>
      this.auth.refresh(data, createInternalMetadata(internalToken)),
    );
  }

  logout(data: LogoutRequest, internalToken: string): Promise<Empty> {
    return this.callGraphql(() =>
      this.auth.logout(data, createInternalMetadata(internalToken)),
    );
  }

  getMe(userId: string, internalToken: string): Promise<UserResponse> {
    const deadline = Date.now() + USERS_READ_TIMEOUT_MS;
    return this.callGraphql(
      () =>
        this.auth
          .getMe({}, createInternalMetadata(internalToken, userId), {
            deadline,
          })
          .pipe(timeout({ first: USERS_READ_TIMEOUT_MS + 250 })),
      { preserveTransportErrors: true },
    );
  }

  private async callGraphql<T>(
    factory: () => Observable<T>,
    options?: { preserveTransportErrors?: boolean },
  ): Promise<T> {
    try {
      return await lastValueFrom(factory());
    } catch (error) {
      if (options?.preserveTransportErrors && isUsersTransportError(error)) {
        throw error;
      }
      throw mapRpcToGraphqlError(error);
    }
  }

  private async callHttp<T>(factory: () => Observable<T>): Promise<T> {
    try {
      return await lastValueFrom(factory());
    } catch (error) {
      throw mapRpcToHttpException(error);
    }
  }
}
