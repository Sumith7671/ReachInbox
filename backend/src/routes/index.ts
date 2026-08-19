import { Router } from 'express';
import authRoutes from './auth.routes';
import campaignRoutes from './campaign.routes';
import emailRoutes from './email.routes';
import uploadRoutes from './upload.routes';
import attachmentRoutes from './attachment.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/emails', emailRoutes);
router.use('/uploads', uploadRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/health', healthRoutes);

export default router;
