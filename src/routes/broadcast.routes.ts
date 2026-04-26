import { Router } from 'express';
import * as broadcast from '../controllers/broadcast.controller';
import { publicRateLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';

const router = Router();

// Public — rate limited (Redis-backed if available, otherwise in-memory)
router.get(
  '/live/:teacherId',
  publicRateLimiter,
  validate(broadcast.liveQuerySchema, 'query'),
  broadcast.getLiveByTeacher,
);

export default router;
