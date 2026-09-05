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
  resendVerification,
  forgotPassword,
  resetPassword,
  getEmailDiagnostic,
  sendTestEmail
} from '../controllers/auth.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

export const router = express.Router();

router.post('/register', authLimiter, register);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/login', authLimiter, login);
router.post('/admin/login', authLimiter, adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateMe);
router.patch('/me', requireAuth, updateMe);

// Safe diagnostic endpoint: available in development/test, or protected by admin in production
router.get('/email-diagnostic', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return requireAuth(req, res, () => requireAdmin(req, res, next));
  }
  next();
}, getEmailDiagnostic);

export default router;
