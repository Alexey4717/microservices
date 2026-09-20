import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { type Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import { USERS_GRPC_CLIENT, createInternalMetadata } from '@libs/common';
import { AUTH_SERVICE_NAME } from '@libs/proto';
import type {
  ConsumeTelegramLinkTokenRequest,
  GetMeByTelegramRequest,
  UpsertTelegramProfileRequest,
  UserResponse,
} from '@libs/proto';

interface AuthGrpcClient {
  getMeByTelegram(
    data: GetMeByTelegramRequest,
    metadata: Metadata,
  ): Observable<UserResponse>;
  consumeTelegramLinkToken(
    data: ConsumeTelegramLinkTokenRequest,
    metadata: Metadata,
  ): Observable<UserResponse>;
  upsertTelegramProfile(
    data: UpsertTelegramProfileRequest,
    metadata: Metadata,
  ): Observable<UserResponse>;
}

@Injectable()
export class UsersGrpcService implements OnModuleInit {
  private auth!: AuthGrpcClient;

  constructor(@Inject(USERS_GRPC_CLIENT) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.auth = this.client.getService<AuthGrpcClient>(AUTH_SERVICE_NAME);
  }

  getMeByTelegram(
    telegramId: string,
    internalToken: string,
  ): Promise<UserResponse> {
    return lastValueFrom(
      this.auth.getMeByTelegram(
        { telegramId },
        createInternalMetadata(internalToken),
      ),
    );
  }

  consumeTelegramLinkToken(
    data: ConsumeTelegramLinkTokenRequest,
    internalToken: string,
  ): Promise<UserResponse> {
    return lastValueFrom(
      this.auth.consumeTelegramLinkToken(
        data,
        createInternalMetadata(internalToken),
      ),
    );
  }

  upsertTelegramProfile(
    data: UpsertTelegramProfileRequest,
    internalToken: string,
  ): Promise<UserResponse> {
    return lastValueFrom(
      this.auth.upsertTelegramProfile(
        data,
        createInternalMetadata(internalToken),
      ),
    );
  }
}
