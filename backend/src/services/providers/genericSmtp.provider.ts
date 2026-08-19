import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ISMTPProvider, SendMailOptions, SendMailResult } from './smtp.provider';

export class GenericSMTPProvider implements ISMTPProvider {
  private transporter: Transporter;

  constructor() {
    const isGmail = config.SMTP_HOST.includes('gmail');

    if (isGmail) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
      });
    }

    logger.info({ host: config.SMTP_HOST, user: config.SMTP_USER }, 'GenericSMTPProvider pooled transporter initialized');
  }

  private convertHtmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\n\s+\n/g, '\n\n')
      .trim();
  }

  public async send(options: SendMailOptions): Promise<SendMailResult> {
    try {
      const senderEmail = config.SMTP_USER || 'sumithreddy509@gmail.com';
      const senderAddress =
        options.from ||
        config.SMTP_FROM ||
        `Sumith Reddy <${senderEmail}>`;

      const plainTextBody = options.text || (options.html ? this.convertHtmlToPlainText(options.html) : '');

      logger.info({ recipient: options.to }, `[SMTP] Sending to ${options.to}`);

      // High-Deliverability Headers for Gmail Primary Inbox placement
      const mailOptions: nodemailer.SendMailOptions = {
        from: senderAddress,
        to: options.to,
        replyTo: senderEmail,
        cc: options.cc || undefined,
        bcc: options.bcc || undefined,
        subject: options.subject,
        text: plainTextBody,
        html: options.html,
        attachments: options.attachments,
        headers: {
          'X-Mailer': 'Nodemailer/ReachInbox Engine',
          'X-Priority': '3', // Normal Priority (High priority triggers spam filters)
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
        },
      };

      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP send timeout')), 10000)
      );

      const info = (await Promise.race([sendPromise, timeoutPromise])) as any;

      logger.info(
        { recipient: options.to, messageId: info?.messageId },
        `[SMTP] Successfully delivered to ${options.to}`
      );

      return {
        success: true,
        messageId: info?.messageId || `msg_${Date.now()}`,
        accepted: Array.isArray(info?.accepted) ? info.accepted : [options.to],
        rejected: Array.isArray(info?.rejected) ? info.rejected : [],
        previewUrl: null,
      };
    } catch (err: any) {
      logger.error({ recipient: options.to, error: err.message }, `[SMTP] Error sending to ${options.to}`);
      return {
        success: false,
        error: err.message || 'SMTP delivery failed',
      };
    }
  }
}
