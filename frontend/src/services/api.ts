import axios from 'axios';
import {
  User,
  EmailJob,
  EmailCampaign,
  DashboardStats,
  LeadParseSummary,
  CreateCampaignPayload,
  PaginationInfo,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Auth Endpoints
  async getMe(): Promise<{ user: User }> {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('reachinbox_token');
  },

  async devLogin(email?: string, name?: string): Promise<{ token: string; user: User }> {
    const res = await api.post<{ token: string; user: User }>('/auth/dev-login', { email, name });
    if (res.data.token) {
      localStorage.setItem('reachinbox_token', res.data.token);
    }
    return res.data;
  },

  // Campaign Endpoints
  async createCampaign(payload: CreateCampaignPayload): Promise<{ campaign: EmailCampaign }> {
    const res = await api.post<{ campaign: EmailCampaign }>('/campaigns', payload);
    return res.data;
  },

  async getCampaigns(): Promise<{ campaigns: EmailCampaign[] }> {
    const res = await api.get<{ campaigns: EmailCampaign[] }>('/campaigns');
    return res.data;
  },

  // Email Endpoints
  async getScheduledEmails(params?: { search?: string; page?: number; limit?: number }): Promise<{
    emails: EmailJob[];
    pagination: PaginationInfo;
  }> {
    const res = await api.get<{ emails: EmailJob[]; pagination: PaginationInfo }>('/emails/scheduled', { params });
    return res.data;
  },

  async getSentEmails(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{
    emails: EmailJob[];
    pagination: PaginationInfo;
  }> {
    const res = await api.get<{ emails: EmailJob[]; pagination: PaginationInfo }>('/emails/sent', { params });
    return res.data;
  },

  async triggerDispatch(): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/emails/trigger-dispatch');
    return res.data;
  },

  async getEmailById(id: string): Promise<{ email: EmailJob }> {
    const res = await api.get<{ email: EmailJob }>(`/emails/${id}`);
    return res.data;
  },

  async getDashboardStats(): Promise<{ stats: DashboardStats }> {
    const res = await api.get<{ stats: DashboardStats }>('/emails/stats');
    return res.data;
  },

  // File Upload Parser Endpoint
  async parseLeadsFile(file: File): Promise<{ summary: LeadParseSummary }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post<{ summary: LeadParseSummary }>('/uploads/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async parseLeadsText(content: string): Promise<{ summary: LeadParseSummary }> {
    const res = await api.post<{ summary: LeadParseSummary }>('/uploads/parse', { content });
    return res.data;
  },

  // Attachment Upload Endpoint (Images, Audio, PDF, DOCX)
  async uploadAttachment(file: File): Promise<{
    success: boolean;
    attachment: { filename: string; filepath: string; mimetype: string; size: number };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // Health Endpoint
  async getHealth(): Promise<{ status: string; database: string; redis: string }> {
    const res = await api.get('/health');
    return res.data;
  },
};
