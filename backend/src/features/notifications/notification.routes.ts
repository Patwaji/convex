import { Router } from 'express';
import { Request, Response } from 'express';
import { verifyToken } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import * as notificationService from './notification.service';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ─── GET /api/notifications ───────────────────────────────────
router.get(
  '/',
  asyncWrapper(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await notificationService.getUserNotifications(userId, limit, offset);
    const unreadCount = await notificationService.getUnreadCount(userId);

    ApiResponse.success(res, {
      notifications,
      unreadCount,
    });
  })
);

// ─── GET /api/notifications/unread-count ─────────────────────
router.get(
  '/unread-count',
  asyncWrapper(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const count = await notificationService.getUnreadCount(userId);
    ApiResponse.success(res, { count });
  })
);

// ─── POST /api/notifications/mark-read ───────────────────────
router.post(
  '/mark-read',
  asyncWrapper(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const { notificationIds } = req.body;

    await notificationService.markAsRead(userId, notificationIds);
    ApiResponse.success(res, null, 'Notifications marked as read');
  })
);

export default router;