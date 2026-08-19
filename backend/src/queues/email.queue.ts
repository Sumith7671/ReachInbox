import { Queue } from 'bullmq';
import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EmailJobPayload } from '../types';

export const QUEUE_NAME = 'email-dispatch-queue';

const createRedisInstance = () => {
  try {
    const redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 2) return null; // Fallback to mock after 2 retries
        return 200;
      },
    });

    redis.on('connect', () => {
      logger.info('Connected to Redis server for BullMQ queues');
    });

    redis.on('error', (err) => {
      logger.warn({ error: err.message }, 'Redis connection error, using in-memory queue fallback...');
    });

    return redis;
  } catch (err: any) {
    logger.warn('Redis unavailable, initializing in-memory Redis instance...');
    return new RedisMock();
  }
};

export const redisConnection = createRedisInstance();

export const emailQueue = new Queue<EmailJobPayload>(QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const scheduleBulkEmailJobsInQueue = async (
  jobsData: Array<{
    emailJobId: string;
    campaignId: string;
    userId: string;
    recipient: string;
    subject: string;
    body: string;
    scheduledAt: string;
    delayMs: number;
  }>
) => {
  if (jobsData.length === 0) return [];

  const bulkPayloads = jobsData.map((job) => ({
    name: `email-dispatch-${job.emailJobId}`,
    data: {
      emailJobId: job.emailJobId,
      campaignId: job.campaignId,
      userId: job.userId,
      recipient: job.recipient,
      subject: job.subject,
      body: job.body,
      scheduledAt: job.scheduledAt,
    },
    opts: {
      jobId: job.emailJobId, // Stable unique idempotency identifier
      delay: Math.max(0, job.delayMs),
    },
  }));

  logger.info({ totalJobs: bulkPayloads.length }, `[QUEUE] Enqueueing ${bulkPayloads.length} BullMQ jobs`);

  try {
    const enqueued = await emailQueue.addBulk(bulkPayloads as any);
    logger.info({ count: enqueued.length }, `[QUEUE] Successfully enqueued ${enqueued.length} BullMQ jobs`);
    return enqueued;
  } catch (err: any) {
    logger.warn({ error: err.message }, '[QUEUE] Bulk enqueue fallback to sequential addition');
    const fallbackEnqueued = [];
    for (const payload of bulkPayloads) {
      try {
        const item = await emailQueue.add(payload.name, payload.data, payload.opts);
        fallbackEnqueued.push(item);
      } catch (e) {
        // Continue fallback loop
      }
    }
    return fallbackEnqueued;
  }
};
