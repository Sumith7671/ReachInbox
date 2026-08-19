import { config } from '../config';
import { logger } from '../utils/logger';
import { ISMTPProvider, SendMailOptions, SendMailResult } from './providers/smtp.provider';
import { GenericSMTPProvider } from './providers/genericSmtp.provider';
import { EtherealSMTPProvider } from './providers/etherealSmtp.provider';
import { MailSendResult } from '../types';

class MailService {
  private provider: ISMTPProvider;

  constructor() {
    // Select Provider based on SMTP_PROVIDER env setting or SMTP credentials presence
    const providerType = config.SMTP_PROVIDER?.toLowerCase() || 'smtp';

    if (providerType === 'ethereal') {
      logger.info('Initializing EtherealSMTPProvider for test environment...');
      this.provider = new EtherealSMTPProvider();
    } else if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      logger.info({ provider: 'smtp', host: config.SMTP_HOST }, 'Initializing GenericSMTPProvider for real inbox delivery...');
      this.provider = new GenericSMTPProvider();
    } else {
      logger.info('No explicit real SMTP credentials found. Defaulting to EtherealSMTPProvider...');
      this.provider = new EtherealSMTPProvider();
    }
  }

  public async sendEmail(params: {
    from?: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    textBody?: string;
    attachments?: { filename: string; path: string; contentType?: string }[];
  }): Promise<MailSendResult> {
    const result: SendMailResult = await this.provider.send({
      from: params.from,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      html: params.body,
      text: params.textBody || params.body.replace(/<[^>]*>?/gm, ''),
      attachments: params.attachments,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
      error: result.error,
    };
  }
}

export const mailService = new MailService();
