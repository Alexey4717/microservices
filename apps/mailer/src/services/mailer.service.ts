import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type Transporter, createTransport } from 'nodemailer';

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_SECURE = true;

type SmtpConfig = {
  user: string;
  pass: string;
  from: string;
};

function nonempty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string | null;

  constructor(private readonly configService: ConfigService) {
    const smtp = this.readSmtpConfig();
    if (!smtp) {
      this.transporter = null;
      this.from = null;
      return;
    }

    this.from = smtp.from;
    this.transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    if (!this.transporter || !this.from) {
      this.logger.warn(
        `Welcome-письмо на ${options.to} пропущено: SMTP не настроен (неполные NODEMAILER_USER_TRANSPORT / NODEMAILER_PASSWORD_TRANSPORT / NODEMAILER_FROM). Сообщение подтверждено, повторной доставки не будет.`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  }

  private readSmtpConfig(): SmtpConfig | null {
    const user = this.configService.get<string>('NODEMAILER_USER_TRANSPORT');
    const pass = this.configService.get<string>(
      'NODEMAILER_PASSWORD_TRANSPORT',
    );
    const from = this.configService.get<string>('NODEMAILER_FROM');

    if (!nonempty(user) || !nonempty(pass) || !nonempty(from)) {
      return null;
    }

    return {
      user: user.trim(),
      pass,
      from: from.trim(),
    };
  }
}
