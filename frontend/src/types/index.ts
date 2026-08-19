export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  googleId?: string | null;
}

export type JobStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailJob {
  id: string;
  campaignId: string;
  userId: string;
  recipient: string;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  body: string;
  textBody?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  status: JobStatus;
  attempts: number;
  errorMessage?: string | null;
  smtpMessageId?: string | null;
  bullJobId?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    id: string;
    subject: string;
    attachments?: AttachmentItem[];
  };
}

export interface AttachmentItem {
  id?: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  previewUrl?: string;
}

export interface EmailCampaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  textBody?: string | null;
  cc?: string | null;
  bcc?: string | null;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  createdAt: string;
  updatedAt: string;
  attachments?: AttachmentItem[];
  _count?: {
    jobs: number;
    attachments?: number;
  };
}

export interface DashboardStats {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
  totalCampaigns: number;
  totalEmails: number;
}

export interface LeadParseSummary {
  totalExtracted: number;
  validEmailsCount: number;
  validEmails: string[];
  duplicatesRemoved: number;
  invalidRemoved: number;
}

export interface CreateCampaignPayload {
  subject: string;
  body: string;
  textBody?: string;
  cc?: string;
  bcc?: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  recipients: string[];
  attachments?: AttachmentItem[];
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
