import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller';
import { requireAuth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/overview', requireAuth, requireRole('principal'), analytics.overview);

export default router;
