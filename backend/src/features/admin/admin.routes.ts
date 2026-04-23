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

function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ─── GET /api/admin/events/pending ──────────────────────────
router.get(
  '/events/pending',
  asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { status: 'pending' };

    const [events, total] = await Promise.all([
      Event.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name email avatar')
      .lean(),
      Event.countDocuments(filter),
    ]);

    // Add flag info for each event
    const eventsWithFlagInfo = await Promise.all(
      events.map(async (event: any) => {
        const isNew = await isNewOrganizer(event.organizer?._id?.toString() || event.organizer);
        return { ...event, isNewOrganizer: isNew };
      })
    );

    ApiResponse.paginated(res, eventsWithFlagInfo, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// ─── GET /api/admin/events/approved ──────────────────────────
router.get(
  '/events/approved',
  asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { status: 'approved' };

    const [events, total] = await Promise.all([
      Event.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name email avatar')
      .lean(),
      Event.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, events, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// ─── GET /api/admin/events/rejected ──────────────────────────
router.get(
  '/events/rejected',
  asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { status: 'rejected' };

    const [events, total] = await Promise.all([
      Event.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name email avatar')
      .lean(),
      Event.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, events, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// ─── GET /api/admin/events/flagged ───────────────────────────
router.get(
  '/events/flagged',
  asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const filter = {
      $or: [
        { isFlagged: true },
        { status: 'pending', reportCount: { $gte: 1 } },
      ],
    };

    const [events, total] = await Promise.all([
      Event.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name email avatar')
      .lean(),
      Event.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, events, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// ─── GET /api/admin/events/delete-requests ─────────────────
router.get(
  '/events/delete-requests',
  asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { 'deletionRequest.status': 'pending' };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ 'deletionRequest.requestedAt': -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('organizer', 'name email avatar')
        .lean(),
      Event.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, events, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// ─── PATCH /api/admin/events/:id/approve ────────────────────
router.patch(
  '/events/:id/request-proof',
  asyncWrapper(async (req: Request, res: Response) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    const adminNote = typeof req.body?.note === 'string' ? req.body.note.trim() : undefined;
    event.isFlagged = true;
    event.flagReason = adminNote || 'Additional proof requested by admin';
    if (event.status !== 'pending') {
      event.status = 'pending';
    }
    await event.save();

    await notificationService.notifyAdminRequestedMoreProof(
      event.organizer.toString(),
      event._id.toString(),
      event.title,
      adminNote
    );

    ApiResponse.success(res, event, 'Additional proof request sent to organizer');
  })
);

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

// ─── PATCH /api/admin/events/:id/approve-delete ────────────
router.patch(
  '/events/:id/approve-delete',
  asyncWrapper(async (req: Request, res: Response) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    if (event.deletionRequest?.status !== 'pending') {
      ApiResponse.error(res, 400, 'INVALID_DELETE_STATUS', 'No pending delete request for this event');
      return;
    }

    const organizerId = event.organizer.toString();
    const eventId = event._id.toString();
    const title = event.title;

    await Promise.all([
      Event.deleteOne({ _id: event._id }),
      User.updateOne({ _id: organizerId }, { $pull: { createdEvents: event._id } }),
      User.updateMany({ joinedEvents: event._id }, { $pull: { joinedEvents: event._id } }),
    ]);

    await notificationService.createNotification(
      organizerId,
      'event_rejected',
      '🗑️ Event Deleted by Admin',
      `Your delete request for "${title}" has been approved. The event was removed.`,
      { eventId, eventTitle: title }
    );

    ApiResponse.success(res, null, 'Delete request approved and event removed');
  })
);

const rejectDeleteSchema = z.object({
  adminNote: z.string().trim().min(3).max(300).optional(),
});

// ─── PATCH /api/admin/events/:id/reject-delete ─────────────
router.patch(
  '/events/:id/reject-delete',
  asyncWrapper(async (req: Request, res: Response) => {
    const { adminNote } = rejectDeleteSchema.parse(req.body ?? {});
    const event = await Event.findById(req.params.id);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    if (event.deletionRequest?.status !== 'pending') {
      ApiResponse.error(res, 400, 'INVALID_DELETE_STATUS', 'No pending delete request for this event');
      return;
    }

    event.deletionRequest = {
      ...event.deletionRequest,
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: req.user!._id,
      adminNote: adminNote || 'Delete request rejected by admin',
    } as any;
    await event.save();

    await notificationService.createNotification(
      event.organizer.toString(),
      'event_rejected',
      '❌ Delete Request Rejected',
      `Admin rejected delete request for "${event.title}".${adminNote ? ` Note: ${adminNote}` : ''}`,
      { eventId: event._id.toString(), eventTitle: event.title, adminNote }
    );

    ApiResponse.success(res, event, 'Delete request rejected');
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

// ─── POST /api/admin/events/bulk ───────────────────────────────
const bulkActionSchema = z.object({
  eventIds: z.array(z.string()).min(1),
  action: z.enum(['approve', 'reject']),
  rejectionNote: z.string().optional(),
}).strict();

router.post(
  '/events/bulk',
  asyncWrapper(async (req: Request, res: Response) => {
    const parseResult = bulkActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      ApiResponse.error(res, 400, 'INVALID_DATA', parseResult.error.errors[0]?.message || 'Invalid data');
      return;
    }

    const { eventIds, action, rejectionNote } = parseResult.data;
    const objectIds = eventIds.map(id => new (require('mongoose').Types.ObjectId)(id));

    if (action === 'approve') {
      await Event.updateMany(
        { _id: { $in: objectIds }, status: 'pending' },
        { status: 'approved', isFlagged: false, flagReason: undefined }
      );
    } else if (action === 'reject') {
      await Event.updateMany(
        { _id: { $in: objectIds }, status: 'pending' },
        { status: 'rejected', rejectionNote: rejectionNote || 'Rejected by admin' }
      );
    }

    ApiResponse.success(res, { modifiedCount: eventIds.length }, `${eventIds.length} events ${action}d`);
  })
);

// ─── GET /api/admin/analytics ───────────────────────────────────
router.get(
  '/analytics',
  asyncWrapper(async (_req: Request, res: Response) => {
    const [
      totalEvents,
      pendingEvents,
      approvedEvents,
      rejectedEvents,
      totalUsers,
      totalRsvps,
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      Event.aggregate([
        { $match: { status: 'approved' } },
        { $project: { attendeeCount: { $size: '$attendees' } } },
        { $group: { _id: null, total: { $sum: '$attendeeCount' } } }
      ]),
    ]);

    const analytics = {
      events: {
        total: totalEvents,
        pending: pendingEvents,
        approved: approvedEvents,
        rejected: rejectedEvents,
      },
      users: {
        total: totalUsers,
      },
      rsvps: {
        total: totalRsvps[0]?.total || 0,
      },
    };

    ApiResponse.success(res, analytics);
  })
);

export default router;
