import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { type Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import { USERS_GRPC_CLIENT, createInternalMetadata } from '@libs/common';
import { AUTH_SERVICE_NAME } from '@libs/proto';
import type { GetMeRequest, UpdateMeRequest, UserResponse } from '@libs/proto';

interface AuthGrpcClient {
  getMe(data: GetMeRequest, metadata: Metadata): Observable<UserResponse>;
  updateMe(data: UpdateMeRequest, metadata: Metadata): Observable<UserResponse>;
}

@Injectable()
export class UsersGrpcService implements OnModuleInit {
  private auth!: AuthGrpcClient;

  constructor(@Inject(USERS_GRPC_CLIENT) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.auth = this.client.getService<AuthGrpcClient>(AUTH_SERVICE_NAME);
  }

  getMe(userId: string, internalToken: string): Promise<UserResponse> {
    return lastValueFrom(
      this.auth.getMe({}, createInternalMetadata(internalToken, userId)),
    );
  }

  updateMe(
    userId: string,
    internalToken: string,
    name: string,
  ): Promise<UserResponse> {
    return lastValueFrom(
      this.auth.updateMe(
        { name },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }
}
