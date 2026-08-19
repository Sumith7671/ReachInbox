import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  googleId?: string | null;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface ParsedLeadsResult {
  totalExtracted: number;
  validEmails: string[];
  duplicatesRemoved: number;
  invalidRemoved: number;
  count: number;
}

export interface EmailJobPayload {
  emailJobId: string;
  campaignId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  senderId?: string;
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | null;
  error?: string;
}
