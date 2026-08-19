import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../queues/email.queue';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';
  let isHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    isHealthy = false;
  }

  try {
    const ping = await redisConnection.ping();
    if (ping === 'PONG') {
      redisStatus = 'connected';
    } else {
      isHealthy = false;
    }
  } catch (err) {
    isHealthy = false;
  }

  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'unhealthy',
    database: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
