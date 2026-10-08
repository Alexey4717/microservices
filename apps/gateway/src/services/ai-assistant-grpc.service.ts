import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import {
  AI_ASSISTANT_GRPC_CLIENT,
  createInternalMetadata,
  mapRpcToGraphqlError,
} from '@libs/common';
import { AI_ASSISTANT_SERVICE_NAME } from '@libs/proto';
import type {
  ActionResult,
  ConfirmActionRequest,
  ConversationDetailResponse,
  ConversationResponse,
  CreateConversationRequest,
  GetConversationRequest,
  ListConversationsRequest,
  ListConversationsResponse,
  RejectActionRequest,
  SendMessageEvent,
  SendMessageRequest,
} from '@libs/proto';

interface AiAssistantGrpcClient {
  createConversation(
    data: CreateConversationRequest,
    metadata: Metadata,
  ): Observable<ConversationResponse>;
  listConversations(
    data: ListConversationsRequest,
    metadata: Metadata,
  ): Observable<ListConversationsResponse>;
  getConversation(
    data: GetConversationRequest,
    metadata: Metadata,
  ): Observable<ConversationDetailResponse>;
  sendMessage(
    data: SendMessageRequest,
    metadata: Metadata,
  ): Observable<SendMessageEvent>;
  confirmAction(
    data: ConfirmActionRequest,
    metadata: Metadata,
  ): Observable<ActionResult>;
  rejectAction(
    data: RejectActionRequest,
    metadata: Metadata,
  ): Observable<ActionResult>;
}

@Injectable()
export class AiAssistantGrpcService implements OnModuleInit {
  private aiAssistant!: AiAssistantGrpcClient;

  constructor(
    @Inject(AI_ASSISTANT_GRPC_CLIENT) private readonly client: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.aiAssistant = this.client.getService<AiAssistantGrpcClient>(
      AI_ASSISTANT_SERVICE_NAME,
    );
  }

  createConversation(
    internalToken: string,
    userId: string,
  ): Promise<ConversationResponse> {
    return this.callGraphql(() =>
      this.aiAssistant.createConversation(
        {},
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  listConversations(
    internalToken: string,
    userId: string,
  ): Promise<ListConversationsResponse> {
    return this.callGraphql(() =>
      this.aiAssistant.listConversations(
        {},
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  getConversation(
    id: string,
    internalToken: string,
    userId: string,
  ): Promise<ConversationDetailResponse> {
    return this.callGraphql(() =>
      this.aiAssistant.getConversation(
        { id },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  sendMessage(
    conversationId: string,
    content: string,
    internalToken: string,
    userId: string,
    pagePath?: string | null,
    temperature?: number | null,
  ): AsyncIterable<SendMessageEvent> {
    return grpcStreamToAsyncIterable(
      this.aiAssistant.sendMessage(
        {
          conversationId,
          content,
          pagePath: pagePath ?? '',
          temperature: temperatureToProto(temperature),
        },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  confirmAction(
    actionId: string,
    internalToken: string,
    userId: string,
  ): Promise<ActionResult> {
    return this.callGraphql(() =>
      this.aiAssistant.confirmAction(
        { actionId },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  rejectAction(
    actionId: string,
    internalToken: string,
    userId: string,
  ): Promise<ActionResult> {
    return this.callGraphql(() =>
      this.aiAssistant.rejectAction(
        { actionId },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  private async callGraphql<T>(factory: () => Observable<T>): Promise<T> {
    try {
      return await lastValueFrom(factory());
    } catch (error) {
      throw mapRpcToGraphqlError(error);
    }
  }
}

function temperatureToProto(value: number | null | undefined): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '';
  }
  return String(value);
}

function grpcStreamToAsyncIterable<T>(source: Observable<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      const queue: T[] = [];
      const waiters: Array<{
        resolve: (value: IteratorResult<T>) => void;
        reject: (error: unknown) => void;
      }> = [];
      let completed = false;
      let failed: Error | undefined;

      const subscription = source.subscribe({
        next(value) {
          const waiter = waiters.shift();
          if (waiter) {
            waiter.resolve({ value, done: false });
            return;
          }
          queue.push(value);
        },
        error(error) {
          failed = mapRpcToGraphqlError(error);
          const waiter = waiters.shift();
          if (waiter) {
            waiter.reject(failed);
          }
        },
        complete() {
          completed = true;
          while (waiters.length > 0) {
            waiters.shift()?.resolve({ value: undefined as T, done: true });
          }
        },
      });

      return {
        next(): Promise<IteratorResult<T>> {
          const queued = queue.shift();
          if (queued !== undefined) {
            return Promise.resolve({ value: queued, done: false });
          }
          if (failed) {
            return Promise.reject(failed);
          }
          if (completed) {
            return Promise.resolve({ value: undefined as T, done: true });
          }
          return new Promise((resolve, reject) => {
            waiters.push({ resolve, reject });
          });
        },
        return(): Promise<IteratorResult<T>> {
          subscription.unsubscribe();
          return Promise.resolve({ value: undefined as T, done: true });
        },
      };
    },
  };
}
