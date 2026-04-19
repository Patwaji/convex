import { Router } from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { verifyToken, requireAdmin } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { Event } from '../events/event.model';
import { User } from '../users/user.model';
import * as notificationService from '../notifications/notification.service';

const router = Router();

// All admin routes require authentication + admin role
router.use(verifyToken, requireAdmin);

// Helper: Get rejection reason from NaaS or use provided
async function getRejectionReason(useNaaS: boolean): Promise<string> {
  if (useNaaS) {
    try {
      const response = await axios.get('https://naas.isalman.dev/no', { timeout: 5000 });
      return response.data?.reason || 'Event rejected by admin';
    } catch {
      return 'My cat walked across the keyboard and decided no.';
    }
  }
  return 'Event rejected by admin';
}

// Helper: Check if organizer is new (first event)
async function isNewOrganizer(organizerId: string): Promise<boolean> {
  const eventCount = await Event.countDocuments({ organizer: organizerId });
  return eventCount <= 1;
}

// Helper: Auto-flag new events that need review
function shouldAutoFlag(event: any): { flagged: boolean; reason?: string } {
  // Flag if no cover image
  if (!event.coverImage) {
    return { flagged: true, reason: 'Missing cover image' };
  }
  // Flag if incomplete venue details
  if (!event.venue?.name || !event.venue?.address) {
    return { flagged: true, reason: 'Incomplete venue information' };
  }
  // Flag if very short description
  if (event.description && event.description.length < 50) {
    return { flagged: true, reason: 'Too short description' };
  }
  return { flagged: false };
}

// ─── POST /api/events/:id/report ──────────────────────────────
router.post(
  '/events/:id/report',
  asyncWrapper(async (req: Request, res: Response) => {
    const { reason } = req.body;
    const eventId = req.params.id;
    
    const event = await Event.findById(eventId);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    // Add report
    event.reports.push({
      reporter: req.user!._id,
      reason: reason || 'Reported by user',
      createdAt: new Date(),
    });
    event.reportCount = event.reports.length;

    // Auto-flag if 3+ reports
    if (event.reportCount >= 3 && !event.isFlagged) {
      event.isFlagged = true;
      event.flagReason = 'Multiple user reports';
    }

    await event.save();
    ApiResponse.success(res, null, 'Event reported successfully');
  })
);

// ─── GET /api/admin/events/pending ──────────────────────────
router.get(
  '/events/pending',
  asyncWrapper(async (_req: Request, res: Response) => {
    const events = await Event.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('organizer', 'name email avatar')
      .lean();

    // Add flag info for each event
    const eventsWithFlagInfo = await Promise.all(
      events.map(async (event: any) => {
        const isNew = await isNewOrganizer(event.organizer?._id?.toString() || event.organizer);
        return { ...event, isNewOrganizer: isNew };
      })
    );

    ApiResponse.success(res, eventsWithFlagInfo);
  })
);

// ─── GET /api/admin/events/approved ──────────────────────────
router.get(
  '/events/approved',
  asyncWrapper(async (_req: Request, res: Response) => {
    const events = await Event.find({ status: 'approved' })
      .sort({ updatedAt: -1 })
      .populate('organizer', 'name email avatar')
      .limit(50)
      .lean();
    ApiResponse.success(res, events);
  })
);

// ─── GET /api/admin/events/rejected ──────────────────────────
router.get(
  '/events/rejected',
  asyncWrapper(async (_req: Request, res: Response) => {
    const events = await Event.find({ status: 'rejected' })
      .sort({ updatedAt: -1 })
      .populate('organizer', 'name email avatar')
      .limit(50)
      .lean();
    ApiResponse.success(res, events);
  })
);

// ─── GET /api/admin/events/flagged ───────────────────────────
router.get(
  '/events/flagged',
  asyncWrapper(async (_req: Request, res: Response) => {
    const events = await Event.find({ 
      $or: [
        { isFlagged: true },
        { status: 'pending', reportCount: { $gte: 1 } }
      ]
    })
      .sort({ updatedAt: -1 })
      .populate('organizer', 'name email avatar')
      .lean();
    ApiResponse.success(res, events);
  })
);

// ─── PATCH /api/admin/events/:id/approve ────────────────────
router.patch(
  '/events/:id/approve',
  asyncWrapper(async (req: Request, res: Response) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    if (event.status !== 'pending') {
      ApiResponse.error(
        res,
        400,
        'INVALID_STATUS',
        `Event is already ${event.status}`
      );
      return;
    }

    // Clear flags when approved
    event.status = 'approved';
    event.isFlagged = false;
    event.flagReason = undefined;
    await event.save();

    // Notify organizer
    await notificationService.notifyEventApproved(
      event.organizer.toString(),
      event._id.toString(),
      event.title
    );

    ApiResponse.success(res, event, 'Event approved and published successfully');
  })
);

// ─── PATCH /api/admin/events/:id/reject ─────────────────────
const rejectSchema = z.object({
  rejectionNote: z.string().min(1, 'Rejection note is required').max(500),
  useNaaS: z.boolean().optional().default(false),
});

router.patch(
  '/events/:id/reject',
  asyncWrapper(async (req: Request, res: Response) => {
    const { rejectionNote, useNaaS } = rejectSchema.parse(req.body);

    const event = await Event.findById(req.params.id);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    if (event.status !== 'pending') {
      ApiResponse.error(
        res,
        400,
        'INVALID_STATUS',
        `Event is already ${event.status}`
      );
      return;
    }

    // Get rejection reason (from NaaS or custom)
    let finalRejectionNote = rejectionNote;
    if (useNaaS) {
      finalRejectionNote = await getRejectionReason(true);
    }

    event.status = 'rejected';
    event.rejectionNote = finalRejectionNote;
    await event.save();

    // Notify organizer
    await notificationService.notifyEventRejected(
      event.organizer.toString(),
      event._id.toString(),
      event.title,
      finalRejectionNote
    );

    ApiResponse.success(res, event, 'Event rejected');
  })
);

// ─── GET /api/admin/users ───────────────────────────────────
router.get(
  '/users',
  asyncWrapper(async (_req: Request, res: Response) => {
    const users = await User.find()
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .lean();
    ApiResponse.success(res, users);
  })
);

export default router;
