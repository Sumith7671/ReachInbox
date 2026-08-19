import { Router } from 'express';
import multer from 'multer';
import { parseUploadLeads } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

router.use(requireAuth);

router.post('/parse', upload.single('file'), parseUploadLeads);

export default router;
