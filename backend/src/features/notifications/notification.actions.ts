import { Router } from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { verifyToken } from '../auth/auth.middleware';
import { asyncWrapper } from '../../shared/utils/asyncWrapper';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { Event } from '../events/event.model';
import * as notificationService from './notification.service';

const router = Router();

router.use(verifyToken);

// ─── POST /api/events/:id/submit-info ─────────────────────────
// User submits additional info for flagged event
const submitInfoSchema = z.object({
  additionalInfo: z.string().min(50, 'Please provide at least 50 characters of additional information').max(1000),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

router.post(
  '/events/:id/submit-info',
  asyncWrapper(async (req: Request, res: Response) => {
    const { additionalInfo, contactPhone, contactEmail } = submitInfoSchema.parse(req.body);
    const userId = req.user!._id.toString();
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      ApiResponse.error(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
      return;
    }

    // Verify user owns this event
    if (event.organizer.toString() !== userId) {
      ApiResponse.error(res, 403, 'FORBIDDEN', 'You can only update your own events');
      return;
    }

    // Check if event is flagged
    if (!event.isFlagged) {
      ApiResponse.error(res, 400, 'NOT_FLAGGED', 'This event is not flagged for review');
      return;
    }

    // Store the additional info in rejectionNote temporarily (or could add a new field)
    const infoMessage = `Additional Info Submitted: ${additionalInfo}${contactPhone ? `\nContact Phone: ${contactPhone}` : ''}${contactEmail ? `\nContact Email: ${contactEmail}` : ''}`;
    
    // Update event with info and unflag for re-review
    event.rejectionNote = infoMessage;
    event.isFlagged = false;
    event.flagReason = 'Additional info submitted - under re-review';
    await event.save();

    // Notify admin (future: could add admin notification system)
    
    // Confirm to user
    ApiResponse.success(res, null, 'Additional information submitted. Your event is now under re-review.');
  })
);

export default router;