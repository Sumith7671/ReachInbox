import { Router } from 'express';
import {
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  getDashboardStats,
  triggerDispatchNow,
} from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/trigger-dispatch', triggerDispatchNow);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/stats', getDashboardStats);
router.get('/:id', getEmailById);

export default router;
