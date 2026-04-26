import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.post('/register', validate(auth.registerSchema), auth.register);
router.post('/login', validate(auth.loginSchema), auth.login);
router.get('/me', requireAuth, auth.me);

export default router;
