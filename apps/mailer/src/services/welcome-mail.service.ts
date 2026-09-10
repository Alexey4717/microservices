import { Injectable } from '@nestjs/common';

import { MailerService } from './mailer.service';

@Injectable()
export class WelcomeMailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcome(to: string): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Добро пожаловать',
      text: 'Вы зарегистрировались на платформе',
    });
  }
}
