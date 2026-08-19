export interface SendMailOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; path: string; contentType?: string }[];
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | null;
  accepted?: string[];
  rejected?: string[];
  error?: string;
}

export interface ISMTPProvider {
  send(options: SendMailOptions): Promise<SendMailResult>;
}
