import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { config } from '../config';
import { QUEUE_NAME } from '../queues/email.queue';
import { EmailJobPayload } from '../types';
import { mailService } from '../services/mail.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false, // Prevents ioredis from buffering commands indefinitely when offline
  commandTimeout: 1000,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

redisClient.on('error', () => {
  // Silent catch
});

export function getHourKey(date: Date = new Date(), senderId: string = 'default'): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  return `email_rate_limit:${senderId}:${yyyy}-${mm}-${dd}-${hh}`;
}

export function getMsUntilNextHour(date: Date = new Date()): number {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return Math.max(1000, nextHour.getTime() - date.getTime());
}

export async function checkAndIncrementRateLimit(
  senderId: string = 'default',
  limit: number = config.MAX_EMAILS_PER_HOUR
): Promise<{ allowed: boolean; currentCount: number }> {
  try {
    const key = getHourKey(new Date(), senderId);
    const currentCount = await redisClient.incr(key);

    if (currentCount === 1) {
      await redisClient.expire(key, 3700);
    }

    if (currentCount > limit) {
      await redisClient.decr(key);
      return { allowed: false, currentCount: currentCount - 1 };
    }

    return { allowed: true, currentCount };
  } catch (err: any) {
    return { allowed: true, currentCount: 1 };
  }
}

/**
 * Core Execution Engine: Processes a single EmailJob record safely.
 * Checks DB status for idempotency, enforces rate limits, sends via SMTP,
 * and updates DB status to SENT or FAILED.
 */
export async function processSingleEmailJob(emailJobId: string): Promise<boolean> {
  try {
    // 1. Idempotency Check against Database with attachments inclusion
    const emailJobRecord = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
      include: {
        campaign: {
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!emailJobRecord) {
      return false;
    }

    if (emailJobRecord.status === 'SENT') {
      logger.info({ emailJobId, recipient: emailJobRecord.recipient }, `[WORKER] Email already SENT to ${emailJobRecord.recipient}. Skipping.`);
      return true;
    }

    logger.info({ emailJobId, recipient: emailJobRecord.recipient }, `[WORKER] Processing ${emailJobRecord.recipient}`);

    const senderId = 'default';
    const maxHourlyLimit = emailJobRecord.campaign?.hourlyLimit || config.MAX_EMAILS_PER_HOUR;
    const rateLimitCheck = await checkAndIncrementRateLimit(senderId, maxHourlyLimit);

    if (!rateLimitCheck.allowed) {
      const delayUntilNextHour = getMsUntilNextHour();
      const nextExecutionTime = new Date(Date.now() + delayUntilNextHour);

      logger.warn(
        { recipient: emailJobRecord.recipient, nextExecutionTime: nextExecutionTime.toISOString() },
        `[RATE_LIMIT] Hourly limit reached! Rescheduling job for ${emailJobRecord.recipient} to next hour.`
      );

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'SCHEDULED',
          scheduledAt: nextExecutionTime,
        },
      });

      return false;
    }

    // 2. Mark DB Status as PROCESSING
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });

    // Extract attachments mapped to Nodemailer format
    const attachmentsToPass = emailJobRecord.campaign?.attachments?.map((att) => ({
      filename: att.filename,
      path: att.filepath,
      contentType: att.mimetype,
    }));

    // 3. Send Email via Nodemailer / MailService
    const result = await mailService.sendEmail({
      to: emailJobRecord.recipient,
      cc: emailJobRecord.cc || emailJobRecord.campaign?.cc || undefined,
      bcc: emailJobRecord.bcc || emailJobRecord.campaign?.bcc || undefined,
      subject: emailJobRecord.subject,
      body: emailJobRecord.body,
      textBody: emailJobRecord.textBody || emailJobRecord.campaign?.textBody || undefined,
      attachments: attachmentsToPass,
    });

    // 4. Update Database Record to SENT or FAILED
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : null,
        smtpMessageId: result.messageId || null,
        errorMessage: result.error || null,
      },
    });

    logger.info(
      { emailJobId, recipient: emailJobRecord.recipient, status: result.success ? 'SENT' : 'FAILED' },
      `[WORKER] Completed execution for ${emailJobRecord.recipient} (Status: ${result.success ? 'SENT' : 'FAILED'})`
    );

    return result.success;
  } catch (err: any) {
    logger.error({ emailJobId, error: err.message }, 'Error in processSingleEmailJob');

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'FAILED',
        errorMessage: err.message || 'Worker execution failure',
      },
    });

    return false;
  }
}

/**
 * Sweeper Worker Trigger: Scans database for due SCHEDULED jobs and processes them concurrently in parallel.
 */
export async function processDueScheduledJobs(): Promise<number> {
  try {
    const dueJobs = await prisma.emailJob.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: new Date(),
        },
      },
      take: 50,
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    if (dueJobs.length === 0) {
      return 0;
    }

    logger.info({ count: dueJobs.length }, `[WORKER] Processing ${dueJobs.length} due SCHEDULED jobs in parallel...`);

    // Execute due jobs in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      dueJobs.map((job) => processSingleEmailJob(job.id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
    return successCount;
  } catch (err: any) {
    logger.error({ error: err.message }, 'Error in processDueScheduledJobs');
    return 0;
  }
}

export function startWorker() {
  // Set up 1000ms periodic sweeper interval for due scheduled jobs
  setInterval(() => {
    processDueScheduledJobs().catch((err) =>
      logger.error({ error: err.message }, 'Error in background worker sweeper')
    );
  }, 1000);

  logger.info('BullMQ Email Worker initialized with parallel concurrency');
}
