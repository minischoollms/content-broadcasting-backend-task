import { Router } from 'express';
import * as approval from '../controllers/approval.controller';
import { requireAuth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(requireAuth, requireRole('principal'));

router.get('/content', validate(approval.listAllSchema, 'query'), approval.listAll);
router.get('/pending', approval.listPending);
router.post('/content/:id/approve', approval.approve);
router.post(
  '/content/:id/reject',
  validate(approval.rejectSchema),
  approval.reject,
);

export default router;
