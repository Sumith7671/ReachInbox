import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { processDueScheduledJobs } from '../workers/email.worker';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const triggerDispatchNow = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Update all SCHEDULED jobs for this user to be due immediately
    await prisma.emailJob.updateMany({
      where: {
        userId: req.user.id,
        status: 'SCHEDULED',
      },
      data: {
        scheduledAt: new Date(),
      },
    });

    // 2. Trigger worker processing asynchronously in background
    setTimeout(() => {
      processDueScheduledJobs().catch((err) =>
        logger.error({ error: err.message }, 'Error during triggerDispatchNow execution')
      );
    }, 10);

    return res.json({ message: 'Triggered immediate dispatch of all scheduled jobs' });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to trigger dispatch');
    return res.status(500).json({ error: 'Failed to trigger dispatch', message: err.message });
  }
};

export const getScheduledEmails = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {
    userId: req.user.id,
    status: { in: ['SCHEDULED', 'PROCESSING'] },
  };

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { recipient: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, emails] = await Promise.all([
    prisma.emailJob.count({ where: whereClause }),
    prisma.emailJob.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limitNum,
      include: {
        campaign: {
          select: { id: true, subject: true },
        },
      },
    }),
  ]);

  return res.json({
    emails,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getSentEmails = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { search, status, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {
    userId: req.user.id,
    status: { in: ['SENT', 'FAILED'] },
  };

  if (status && (status === 'SENT' || status === 'FAILED')) {
    whereClause.status = status;
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { recipient: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, emails] = await Promise.all([
    prisma.emailJob.count({ where: whereClause }),
    prisma.emailJob.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        campaign: {
          select: { id: true, subject: true },
        },
      },
    }),
  ]);

  return res.json({
    emails,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getEmailById = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  const email = await prisma.emailJob.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
    include: {
      campaign: true,
    },
  });

  if (!email) {
    return res.status(404).json({ error: 'Email job not found' });
  }

  return res.json({ email });
};

export const getDashboardStats = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user.id;

  const [scheduled, processing, sent, failed, totalCampaigns] = await Promise.all([
    prisma.emailJob.count({ where: { userId, status: 'SCHEDULED' } }),
    prisma.emailJob.count({ where: { userId, status: 'PROCESSING' } }),
    prisma.emailJob.count({ where: { userId, status: 'SENT' } }),
    prisma.emailJob.count({ where: { userId, status: 'FAILED' } }),
    prisma.emailCampaign.count({ where: { userId } }),
  ]);

  return res.json({
    stats: {
      scheduled,
      processing,
      sent,
      failed,
      totalCampaigns,
      totalEmails: scheduled + processing + sent + failed,
    },
  });
};
