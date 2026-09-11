import { Injectable } from '@nestjs/common';

import type {
  UserCreatedEvent,
  UserPublicProfilePayload,
  UserUpdatedEvent,
} from '@libs/common';
import type { UserResponse } from '@libs/proto';

import { PrismaService } from './prisma.service';

export type UserProjectionRecord = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type ProjectionWrite = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
};

@Injectable()
export class UserProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromProfile(user: UserResponse): Promise<void> {
    await this.upsert(fromPublicProfile(user));
  }

  async upsertFromCreated(event: UserCreatedEvent): Promise<void> {
    await this.upsert(fromUserEvent(event));
  }

  async upsertFromUpdated(event: UserUpdatedEvent): Promise<void> {
    await this.upsert(fromUserEvent(event));
  }

  async findById(id: string): Promise<UserResponse | null> {
    const record = await this.prisma.userProjection.findUnique({
      where: { id },
    });
    if (!record) {
      return null;
    }
    return toUserResponse(record);
  }

  private async upsert(input: ProjectionWrite): Promise<void> {
    const name = emptyToNull(input.name);
    const avatarUrl = emptyToNull(input.avatarUrl);

    await this.prisma.userProjection.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        email: input.email,
        name,
        avatarUrl,
      },
      update: {
        email: input.email,
        name,
        avatarUrl,
      },
    });
  }
}

function fromPublicProfile(user: UserResponse): ProjectionWrite {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}

function fromUserEvent(event: UserPublicProfilePayload): ProjectionWrite {
  return {
    id: event.userId,
    email: event.email,
    name: event.name,
    avatarUrl: event.avatarUrl,
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toUserResponse(record: UserProjectionRecord): UserResponse {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? '',
    avatarUrl: record.avatarUrl ?? '',
  };
}
