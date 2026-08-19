import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadAttachment = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.file;
  const maxSizeBytes = 25 * 1024 * 1024; // 25MB limit

  if (file.size > maxSizeBytes) {
    return res.status(400).json({
      error: 'File size limit exceeded',
      message: 'Attachment file size exceeds the 25MB limit.',
    });
  }

  const filename = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filepath, file.buffer);

  logger.info({ filename, filepath, size: file.size }, '[ATTACHMENT] File stored successfully');

  return res.json({
    success: true,
    attachment: {
      filename: file.originalname,
      filepath,
      mimetype: file.mimetype,
      size: file.size,
    },
  });
};
