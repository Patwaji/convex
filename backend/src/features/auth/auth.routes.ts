import { Router } from 'express';
import * as authController from './auth.controller';
import { verifyToken } from './auth.middleware';
import { authLimiter } from '../../shared/middleware/rateLimiter';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';

const router = Router();

// Apply stricter rate limiting to auth routes
router.use(authLimiter);

// POST /api/auth/signup
router.post('/signup', asyncWrapper(authController.signup));

// POST /api/auth/login
router.post('/login', asyncWrapper(authController.login));

// POST /api/auth/refresh
router.post('/refresh', asyncWrapper(authController.refresh));

// POST /api/auth/logout (auth required)
router.post('/logout', verifyToken, asyncWrapper(authController.logout));

// GET /api/auth/me (auth required)
router.get('/me', verifyToken, asyncWrapper(authController.getMe));

export default router;
