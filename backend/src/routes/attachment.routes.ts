import { Router } from 'express';
import multer from 'multer';
import { uploadAttachment } from '../controllers/attachment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const router = Router();

router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadAttachment);

export default router;
