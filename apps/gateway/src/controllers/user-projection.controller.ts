import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import {
  USER_EVENTS,
  type UserAuthenticatedEvent,
  type UserCreatedEvent,
  type UserUpdatedEvent,
} from '@libs/common';

import { UserProjectionService } from '../services/user-projection.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller()
export class UserProjectionController {
  private readonly logger = new Logger(UserProjectionController.name);

  constructor(private readonly userProjection: UserProjectionService) {}

  @EventPattern(USER_EVENTS.CREATED)
  async handleUserCreated(@Payload() payload: UserCreatedEvent): Promise<void> {
    if (!isValidCreated(payload)) {
      this.logger.warn(`Пропускаю ${USER_EVENTS.CREATED}: невалидный payload`);
      return;
    }

    await this.userProjection.upsertFromCreated(payload);
  }

  @EventPattern(USER_EVENTS.UPDATED)
  async handleUserUpdated(@Payload() payload: UserUpdatedEvent): Promise<void> {
    if (!isValidUpdated(payload)) {
      this.logger.warn(`Пропускаю ${USER_EVENTS.UPDATED}: невалидный payload`);
      return;
    }

    await this.userProjection.upsertFromUpdated(payload);
  }

  @EventPattern(USER_EVENTS.AUTHENTICATED)
  handleUserAuthenticated(@Payload() _payload: UserAuthenticatedEvent): void {
    // Binding `user.#` также доставляет этот ключ; без handler Nest роняет consumer.
  }
}

function isValidCreated(
  payload: UserCreatedEvent | undefined,
): payload is UserCreatedEvent {
  return Boolean(
    payload?.userId && payload.email && EMAIL_PATTERN.test(payload.email),
  );
}

function isValidUpdated(
  payload: UserUpdatedEvent | undefined,
): payload is UserUpdatedEvent {
  return Boolean(
    payload?.userId && payload.email && EMAIL_PATTERN.test(payload.email),
  );
}
