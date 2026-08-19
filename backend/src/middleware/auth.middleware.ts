import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AuthUser } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fallback to HTTP-only cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token missing or invalid session',
      });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;

    // Fetch fresh user from DB or use payload
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          googleId: user.googleId,
        };
      } else {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          avatarUrl: decoded.avatarUrl,
          googleId: decoded.googleId,
        };
      }
    } catch {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        avatarUrl: decoded.avatarUrl,
        googleId: decoded.googleId,
      };
    }

    next();
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Authentication verification failed');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
    return;
  }
}
