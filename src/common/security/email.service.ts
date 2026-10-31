import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Email delivery abstraction. In development it logs the message; in production
 * it is a stub that should be replaced by a real provider (SES, SendGrid,
 * Postmark, ...). The interface stays stable so the rest of the app never
 * changes when a provider is wired in.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: AppConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    if (this.config.isProd) {
      // TODO: integrate a real transactional email provider.
      this.logger.warn(
        `Email provider not configured. Dropping email to ${message.to} (subject: ${message.subject})`,
      );
      return;
    }
    this.logger.log(
      `📧 Outbound email\nTo: ${message.to}\nSubject: ${message.subject}\n${message.text}`,
    );
  }
}
