import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { scheduleBulkEmailJobsInQueue } from '../queues/email.queue';
import { processDueScheduledJobs } from '../workers/email.worker';
import { LeadParserService } from '../services/leadParser.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const attachmentSchema = z.object({
  filename: z.string(),
  filepath: z.string(),
  mimetype: z.string(),
  size: z.number(),
});

const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  textBody: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  startTime: z.string().optional(),
  delayBetweenEmails: z.number().int().min(0).default(0),
  hourlyLimit: z.number().int().min(1).default(200),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const createCampaign = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const validated = createCampaignSchema.parse(req.body);
    const userId = req.user.id;

    // Run recipient list through LeadParserService for strict normalization & deduplication
    const rawRecipientsText = validated.recipients.join('\n');
    const parserResult = LeadParserService.parseLeads(rawRecipientsText, 'campaign_input.txt');
    const validRecipients = parserResult.validEmails;

    if (validRecipients.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid recipient email addresses were provided.',
      });
    }

    // Safely parse start time date
    const parsedStartMs = validated.startTime ? Date.parse(validated.startTime) : Date.now();
    const startTimeDate = !isNaN(parsedStartMs) ? new Date(parsedStartMs) : new Date();
    const baseTimeMs = Math.max(Date.now(), startTimeDate.getTime());

    // 1. Create EmailCampaign record in DB
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        subject: validated.subject,
        body: validated.body,
        textBody: validated.textBody || null,
        cc: validated.cc || null,
        bcc: validated.bcc || null,
        startTime: new Date(baseTimeMs),
        delayBetweenEmails: validated.delayBetweenEmails,
        hourlyLimit: validated.hourlyLimit,
        attachments: {
          create: validated.attachments.map((att) => ({
            filename: att.filename,
            filepath: att.filepath,
            mimetype: att.mimetype,
            size: att.size,
          })),
        },
      },
      include: {
        attachments: true,
      },
    });

    logger.info(
      { campaignId: campaign.id, userId, totalRecipients: validRecipients.length, attachmentsCount: campaign.attachments.length },
      `[CAMPAIGN] Created campaign with ${validRecipients.length} recipients and ${campaign.attachments.length} attachments`
    );

    // 2. Perform bulk database creation for N recipients
    const jobsToCreate = validRecipients.map((recipient, i) => {
      const jobScheduledTimeMs = baseTimeMs + i * validated.delayBetweenEmails;
      return {
        campaignId: campaign.id,
        userId,
        recipient,
        cc: validated.cc || null,
        bcc: validated.bcc || null,
        subject: validated.subject,
        body: validated.body,
        textBody: validated.textBody || null,
        scheduledAt: new Date(jobScheduledTimeMs),
        status: 'SCHEDULED',
      };
    });

    // Execute bulk creation transaction
    await prisma.emailJob.createMany({
      data: jobsToCreate,
    });

    // Fetch created EmailJob records to obtain assigned IDs
    const createdEmailJobs = await prisma.emailJob.findMany({
      where: {
        campaignId: campaign.id,
        userId,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 3. Prepare bulk BullMQ jobs payloads
    const bulkQueueItems = createdEmailJobs.map((emailJob) => {
      const delayMs = Math.max(0, new Date(emailJob.scheduledAt).getTime() - Date.now());
      return {
        emailJobId: emailJob.id,
        campaignId: campaign.id,
        userId,
        recipient: emailJob.recipient,
        subject: emailJob.subject,
        body: emailJob.body,
        scheduledAt: new Date(emailJob.scheduledAt).toISOString(),
        delayMs,
      };
    });

    // Enqueue BullMQ delayed jobs
    await scheduleBulkEmailJobsInQueue(bulkQueueItems);

    // 4. Immediately trigger worker processing for due jobs
    setTimeout(() => {
      processDueScheduledJobs().catch((err) =>
        logger.error({ error: err.message }, 'Error in immediate campaign process trigger')
      );
    }, 50);

    return res.status(201).json({
      success: true,
      message: 'Campaign scheduled successfully',
      campaignId: campaign.id,
      totalRecipients: parserResult.totalExtracted,
      scheduledRecipients: createdEmailJobs.length,
      duplicatesRemoved: parserResult.duplicatesRemoved,
      invalidEmails: parserResult.invalidRemoved,
      attachmentsCount: campaign.attachments.length,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to create campaign');
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

export const getCampaigns = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { jobs: true, attachments: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ campaigns });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};
