import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateMailerEnv } from '@libs/common';

import { HealthController } from './controllers/health.controller';
import { MailerController } from './controllers/mailer.controller';
import { MailerService } from './services/mailer.service';
import { WelcomeMailService } from './services/welcome-mail.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateMailerEnv,
    }),
  ],
  controllers: [HealthController, MailerController],
  providers: [MailerService, WelcomeMailService],
})
export class MailerModule {}
