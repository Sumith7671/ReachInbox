import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ISMTPProvider, SendMailOptions, SendMailResult } from './smtp.provider';

export class EtherealSMTPProvider implements ISMTPProvider {
  private transporter: Transporter | null = null;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (config.ETHEREAL_USER && config.ETHEREAL_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: config.ETHEREAL_HOST,
        port: config.ETHEREAL_PORT,
        secure: config.ETHEREAL_PORT === 465,
        auth: {
          user: config.ETHEREAL_USER,
          pass: config.ETHEREAL_PASSWORD,
        },
      });
      return this.transporter;
    }

    try {
      const testAccountPromise = nodemailer.createTestAccount();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ethereal test account generation timeout')), 3000)
      );

      const testAccount = (await Promise.race([testAccountPromise, timeoutPromise])) as any;

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        connectionTimeout: 4000,
      });

      logger.info({ user: testAccount.user }, 'Initialized Ethereal test SMTP account');
      return this.transporter;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Using local JSON mail transport fallback');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return this.transporter;
    }
  }

  public async send(options: SendMailOptions): Promise<SendMailResult> {
    try {
      const transporter = await this.getTransporter();
      const senderAddress = options.from || 'ReachInbox Outreach <outreach@reachinbox.ai>';

      logger.info({ recipient: options.to }, `[ETHEREAL SMTP] Sending to ${options.to}`);

      const mailOptions: nodemailer.SendMailOptions = {
        from: senderAddress,
        to: options.to,
        cc: options.cc || undefined,
        bcc: options.bcc || undefined,
        subject: options.subject,
        text: options.text || options.html?.replace(/<[^>]*>?/gm, ''),
        html: options.html,
        attachments: options.attachments,
      };

      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ethereal send timeout')), 8000)
      );

      const info = (await Promise.race([sendPromise, timeoutPromise])) as any;
      const previewUrl = nodemailer.getTestMessageUrl(info);

      logger.info(
        { recipient: options.to, messageId: info?.messageId, previewUrl: previewUrl || 'N/A' },
        `[ETHEREAL SMTP] Delivered to ${options.to}`
      );

      return {
        success: true,
        messageId: info?.messageId || `msg_${Date.now()}`,
        previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
        accepted: Array.isArray(info?.accepted) ? info.accepted : [options.to],
        rejected: Array.isArray(info?.rejected) ? info.rejected : [],
      };
    } catch (err: any) {
      logger.error({ recipient: options.to, error: err.message }, `[ETHEREAL SMTP] Error sending to ${options.to}`);
      return {
        success: false,
        error: err.message || 'Ethereal SMTP delivery failed',
      };
    }
  }
}
