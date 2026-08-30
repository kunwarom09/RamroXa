import express from 'express';
import {
  register,
  login,
  adminLogin,
  refresh,
  logout,
  me,
  updateMe,
  verifyEmail,
  resendVerification
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

export const router = express.Router();

router.post('/register', authLimiter, register);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/login', authLimiter, login);
router.post('/admin/login', authLimiter, adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateMe);
router.patch('/me', requireAuth, updateMe);

export default router;
