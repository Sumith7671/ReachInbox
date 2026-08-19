import { Request, Response } from 'express';
import { LeadParserService } from '../services/leadParser.service';
import { logger } from '../utils/logger';

export const parseUploadLeads = async (req: Request, res: Response) => {
  let fileContent = '';
  let filename = '';

  // 1. If file uploaded via Multer
  if (req.file) {
    fileContent = req.file.buffer.toString('utf-8');
    filename = req.file.originalname;
  }
  // 2. If raw text content sent in body JSON
  else if (req.body && req.body.content) {
    fileContent = req.body.content;
    filename = req.body.filename || 'manual_input.txt';
  } else {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'No file or content uploaded. Send a CSV/TXT file or content parameter.',
    });
  }

  const result = LeadParserService.parseLeads(fileContent, filename);

  logger.info(
    { filename, validEmailsCount: result.count, duplicatesRemoved: result.duplicatesRemoved },
    '[LEAD PARSER CONTROLLER] Lead extraction completed successfully'
  );

  return res.json({
    success: true,
    message: 'Leads processed and validated successfully',
    summary: {
      totalExtracted: result.totalExtracted,
      validEmailsCount: result.count,
      validEmails: result.validEmails,
      duplicatesRemoved: result.duplicatesRemoved,
      invalidRemoved: result.invalidRemoved,
    },
  });
};
