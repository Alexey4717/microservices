import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { USER_EVENTS, type UserCreatedEvent } from '@libs/common';

import { WelcomeMailService } from '../services/welcome-mail.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller()
export class MailerController {
  private readonly logger = new Logger(MailerController.name);

  constructor(private readonly welcomeMailService: WelcomeMailService) {}

  @EventPattern(USER_EVENTS.CREATED)
  async handleUserCreated(@Payload() payload: UserCreatedEvent): Promise<void> {
    const email = payload?.email;
    if (!email || !EMAIL_PATTERN.test(email)) {
      this.logger.warn(
        `Пропускаю ${USER_EVENTS.CREATED}: невалидный email (${String(email)})`,
      );
      return;
    }

    this.logger.log(`Отправка welcome-письма на ${email}`);

    try {
      await this.welcomeMailService.sendWelcome(email);
    } catch (error) {
      this.logger.error(
        `Ошибка SMTP при отправке welcome на ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
