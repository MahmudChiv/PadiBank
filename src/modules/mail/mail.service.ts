import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  
  constructor(
    private readonly mailService: MailerService,
  ) {}

  async sendVerificationMail(to: string, code: string, firstName: string) {
    this.logger.log(`Sending verification email to ${to}`);
    try {
      await this.mailService.sendMail({
        to,
        subject: 'Verify your Email',
        text: `Hello ${firstName}, find below your verification code`,
        html: `Your verifiction code: ${code}. It expires in 10 minutes`,
      });
      this.logger.log(`Email delivered to ${to}`)
    } catch (error) {
      this.logger.error(
        `Error sending verification email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
