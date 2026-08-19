import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const prisma = new PrismaClient();
const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const allowed =
        origin === config.FRONTEND_URL ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.netlify.app');

      if (allowed) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for easy cloud deployment & testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Passport Google OAuth Strategy Setup
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID || 'demo-client-id',
      clientSecret: config.GOOGLE_CLIENT_SECRET || 'demo-client-secret',
      callbackURL: config.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google OAuth profile'), false);
        }

        const name = profile.displayName || email.split('@')[0];
        const avatarUrl = profile.photos && profile.photos[0]?.value;

        // Upsert User in PostgreSQL
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            googleId: profile.id,
            name,
            avatarUrl,
          },
          create: {
            email,
            name,
            avatarUrl,
            googleId: profile.id,
          },
        });

        return done(null, user);
      } catch (error) {
        logger.error({ error }, 'Error in Google OAuth Strategy verify callback');
        return done(error as Error, false);
      }
    }
  )
);

app.use(passport.initialize());

// API Routes
app.use('/api', apiRoutes);

// Root Status Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ReachInbox Email Scheduler API',
    version: '1.0.0',
    status: 'online',
    docs: '/api/health',
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
