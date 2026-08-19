# ReachInbox — Production-Grade Full-Stack Email Scheduler

> **A production-grade, highly reliable full-stack email scheduling platform inspired by ReachInbox.ai.**  
> Built with React, TypeScript, Tailwind CSS, Express.js, PostgreSQL, Prisma ORM, Redis, BullMQ, Nodemailer, and Google OAuth.

---

## 📐 Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend["Frontend (React + TS + Tailwind CSS)"]
        UI[SaaS Dashboard UI]
        Composer[Campaign Composer & CSV Parser]
    end

    subgraph Backend["Backend API (Express.js + TypeScript)"]
        API[REST API Server]
        Auth[Google OAuth / Session Auth]
        Parser[Lead Validation Engine]
        PrismaDB[(Prisma ORM)]
    end

    subgraph Storage["Persistence Layer"]
        PG[(PostgreSQL Database)]
        Redis[(Redis Key-Value Data Store)]
    end

    subgraph QueueWorker["Queue & Worker Engine (BullMQ)"]
        Queue[BullMQ Delayed Job Queue]
        Worker[BullMQ Worker Pool]
        Limiter[Redis Atomic Rate Limiter]
        Idempotency[Idempotency Guard]
    end

    subgraph External["External Services"]
        SMTP[Nodemailer / Ethereal SMTP]
        GoogleOAuth[Google OAuth 2.0 Provider]
    end

    UI -->|REST API Calls / Axios| API
    Composer -->|POST /api/campaigns| API
    API -->|Authenticate| Auth
    Auth -->|OAuth2 Redirect| GoogleOAuth
    API -->|Persist User / Campaign / EmailJob| PG
    API -->|Enqueue Delayed Jobs| Queue
    Queue -->|Persist Job State| Redis
    Worker -->|Fetch Due Delayed Jobs| Queue
    Worker -->|Check & Lock Status| Idempotency
    Idempotency -->|Query State| PG
    Worker -->|Atomic INCR Rate Check| Limiter
    Limiter -->|Read/Write Counter| Redis
    Worker -->|Deliver Email| SMTP
    Worker -->|Update Status: SENT / FAILED| PG
```

---

## 🚀 Key Architectural Features

### 1. Zero Cron Jobs & Restart-Safe Delayed Scheduling
- **No `node-cron`, `cron`, `agenda`, `setInterval`, or in-memory timers are used.**
- All scheduled emails are saved to PostgreSQL with status `SCHEDULED` and enqueued into **BullMQ delayed jobs** backed by persistent Redis storage.
- **Server Restart Resilience**: If the Node process or worker crashes at 5:00 PM and restarts at 5:30 PM, BullMQ reconnects to Redis and preserves all delayed timers. Future scheduled jobs (e.g., set for 6:00 PM) will execute at precisely 6:00 PM without needing job recreation or memory restoration hacks.

### 2. Redis Atomic Hourly Rate Limiting
- **Redis Atomic Counter**: Rate limits are tracked using Redis atomic keys formatted as `email_rate_limit:{senderId}:{YYYY-MM-DD-HH}`.
- **Rescheduling instead of dropping**: When a worker attempts to dispatch an email but the hourly quota (e.g., `200` emails/hour) has been consumed:
  1. The job is **NEVER dropped, deleted, or marked as FAILED**.
  2. The worker calculates the exact millisecond offset until the top of the next UTC hour.
  3. The BullMQ job is moved to delayed status for the start of the next hour using `job.moveToDelayed(...)`.
  4. The PostgreSQL database status remains `SCHEDULED` with an updated execution timestamp.
- **Multi-Worker Safe**: Because Redis handles `INCR` atomically, multiple concurrent worker processes share exact rate limit coordination.

### 3. Strict Idempotency & Concurrency Safety
- Every email recipient in a campaign is assigned a unique database `EmailJob` record (`uuid`).
- BullMQ jobs use a deterministic `jobId` prefix (`email_job_${emailJobId}`).
- Before sending via SMTP, the worker verifies the current state in PostgreSQL:
  ```ts
  if (emailJobRecord.status === 'SENT') {
    logger.info('Email already SENT. Skipping duplicate dispatch.');
    return;
  }
  ```
- Status transitions follow an atomic state machine: `SCHEDULED` -> `PROCESSING` -> `SENT` (or `FAILED`).

### 4. Lead Parsing & Deduplication Engine
- Drag-and-drop CSV and TXT lead parser.
- Automatically extracts valid RFC 5322 email addresses, filters out headers (`email`, `email_address`, `recipient`), removes duplicate entries, and filters invalid emails before showing pre-schedule stats.

---

## 📂 Monorepo Folder Structure

```
reachinbox-email-scheduler/
│
├── backend/
│   ├── src/
│   │   ├── config/          # Zod-validated environment config
│   │   ├── controllers/     # Auth, Campaign, Email, Upload controllers
│   │   ├── middleware/      # Authentication & Error middleware
│   │   ├── queues/          # BullMQ queue setup & Redis connection
│   │   ├── routes/          # REST API route declarations
│   │   ├── services/        # Nodemailer & Ethereal SMTP mail service
│   │   ├── types/           # TypeScript type declarations
│   │   ├── utils/           # Lead parser & Pino structured logger
│   │   ├── workers/         # BullMQ email worker with rate limiting
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entrypoint
│   │
│   ├── prisma/
│   │   └── schema.prisma    # PostgreSQL Prisma schema
│   │
│   ├── src/__tests__/       # Jest unit tests for parser & rate limiter
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, StatCard, StatusBadge, Modal
│   │   ├── context/         # AuthContext & ToastContext
│   │   ├── pages/           # Login, Dashboard, Scheduled, Sent, Compose
│   │   ├── services/        # Centralized Axios API service layer
│   │   ├── types/           # Shared TypeScript interfaces
│   │   ├── App.tsx          # Main React router & layout
│   │   └── main.tsx         # React entrypoint
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml       # PostgreSQL 16 & Redis 7 services
├── README.md                # System documentation & setup guide
└── .gitignore
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://reachinbox:reachinbox_password@localhost:5432/reachinbox_db?schema=public
REDIS_URL=redis://localhost:6379

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

SESSION_SECRET=reachinbox-super-secret-session-key-2026
JWT_SECRET=reachinbox-jwt-secret-key-production-grade-2026

ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASSWORD=

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200

FRONTEND_URL=http://localhost:3000
```

---

## 🛠️ Quickstart Setup Guide

### 1. Launch Storage Infrastructure (PostgreSQL & Redis)
Ensure Docker Desktop is running, then start the containers:
```bash
docker compose up -d
```

### 2. Setup & Run Backend API
```bash
cd backend

# Install dependencies
npm install

# Push database schema & generate Prisma Client
npx prisma db push

# Run unit tests
npm test

# Start API server & BullMQ Worker in development mode
npm run dev
```

### 3. Setup & Run Frontend Application
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 📮 API Endpoints Reference

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Initiates Google OAuth authentication | No |
| `GET` | `/api/auth/google/callback` | OAuth redirect callback handler | No |
| `POST` | `/api/auth/dev-login` | Developer/Demo instant authentication | No |
| `GET` | `/api/auth/me` | Fetches authenticated user profile | Yes |
| `POST` | `/api/auth/logout` | Clears authentication session cookie | Yes |
| `POST` | `/api/campaigns` | Creates campaign and enqueues delayed jobs | Yes |
| `GET` | `/api/campaigns` | Lists user campaigns | Yes |
| `GET` | `/api/emails/scheduled` | Gets scheduled & processing queue jobs | Yes |
| `GET` | `/api/emails/sent` | Gets sent & failed delivery logs | Yes |
| `GET` | `/api/emails/stats` | Aggregated dashboard metric counts | Yes |
| `GET` | `/api/emails/:id` | Detailed email job preview | Yes |
| `POST` | `/api/uploads/parse` | Drag & drop lead file parser (CSV/TXT) | Yes |
| `GET` | `/api/health` | Health check for PostgreSQL & Redis | No |

---

## 📈 1,000+ Email Scheduling Scenario

When **1,000 emails** are scheduled for the exact same start time:
1. **Persistence**: 1,000 `EmailJob` records are created in PostgreSQL in a transaction.
2. **Queueing**: 1,000 delayed BullMQ jobs are registered in Redis.
3. **Throttling**: The minimum delay (`2000ms`) ensures emails are staged sequentially (`T+0`, `T+2s`, `T+4s`, ...).
4. **Hourly Limit**: The first `200` emails send during Hour 1. When job #201 evaluates its Redis rate limit counter (`201 > 200`), it is automatically postponed to `Hour 2:00:00 AM` without dropping or failing.
5. **Worker Concurrency**: `WORKER_CONCURRENCY=5` allows 5 emails to process simultaneously while respecting atomic locks.

---

## 🔬 Test Suite

Run backend test suite covering lead parser, rate limiter key generator, and date math:
```bash
cd backend
npm test
```

---

## 🛡️ License & Credits
Inspired by **ReachInbox.ai**. Built for production-grade engineering reviews.
