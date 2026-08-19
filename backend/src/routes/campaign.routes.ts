import { Router } from 'express';
import { createCampaign, getCampaigns } from '../controllers/campaign.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createCampaign);
router.get('/', getCampaigns);

export default router;
