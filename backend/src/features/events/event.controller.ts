import { Request, Response } from 'express';
import { z } from 'zod';
import * as eventService from './event.service';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { EVENT_CATEGORIES } from './event.model';
import { uploadEventCoverImage } from '../../shared/utils/cloudinary';

// ─── Validation Schemas ─────────────────────────────────────
const createEventSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  category: z.enum(EVENT_CATEGORIES),
  tags: z.array(z.string()).optional().default([]),
  coverImage: z.string().optional(),
  date: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endDate: z.string().datetime({ offset: true }).optional(),
  venue: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90),   // latitude
      ]),
    }),
  }),
  maxAttendees: z.number().min(1).optional(),
}).superRefine((data, ctx) => {
  if (!data.endDate) return;

  const start = new Date(data.date);
  const end = new Date(data.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'endDate must be greater than date',
    });
  }
});

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(100000).default(10000),
});

const joinEventSchema = z.object({});

const requestDeleteSchema = z.object({
  reason: z.string().trim().min(3).max(300).optional(),
});

const verifyAttendeeSchema = z.object({
  attendeeId: z.string().min(1),
  verificationCode: z.string().trim().min(6).max(40),
});

// ─── Controllers ────────────────────────────────────────────

export async function listEvents(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const dateFilter = req.query.dateFilter as 'today' | 'week' | 'month' | undefined;
  const sort = req.query.sort as 'date' | 'popularity' | undefined;
  const hobbies = req.query.hobbies ? (req.query.hobbies as string).split(',') : undefined;

  const result = await eventService.listEvents({ page, limit, category, search, dateFilter, sort, hobbies });
  ApiResponse.paginated(res, result.events, result.pagination);
}

export async function getEventById(req: Request, res: Response): Promise<void> {
  const event = await eventService.getEventById(req.params.id!, req.user?._id?.toString());
  ApiResponse.success(res, event);
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const data = createEventSchema.parse(req.body);
  const event = await eventService.createEvent(req.user!._id.toString(), {
    ...data,
    date: new Date(data.date),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });
  ApiResponse.created(res, event, 'Event created — pending admin approval');
}

export async function uploadCoverImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    const error = new Error('Image file is required') as any;
    error.statusCode = 400;
    error.code = 'IMAGE_REQUIRED';
    throw error;
  }

  if (!req.file.mimetype.startsWith('image/')) {
    const error = new Error('Only image uploads are allowed') as any;
    error.statusCode = 400;
    error.code = 'INVALID_IMAGE_TYPE';
    throw error;
  }

  const base64 = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${base64}`;
  const uploaded = await uploadEventCoverImage(dataUri);

  ApiResponse.success(
    res,
    { url: uploaded.secure_url, publicId: uploaded.public_id },
    'Cover image uploaded successfully'
  );
}

export async function joinEvent(req: Request, res: Response): Promise<void> {
  joinEventSchema.parse(req.body ?? {});
  const event = await eventService.joinEvent(req.params.id!, req.user!._id.toString());
  ApiResponse.success(res, event, 'Successfully joined event');
}

export async function leaveEvent(req: Request, res: Response): Promise<void> {
  const event = await eventService.leaveEvent(req.params.id!, req.user!._id.toString());
  ApiResponse.success(res, event, 'Successfully left event');
}

export async function getMyCreatedEvents(req: Request, res: Response): Promise<void> {
  const events = await eventService.getMyCreatedEvents(req.user!._id.toString());
  ApiResponse.success(res, events);
}

export async function getMyJoinedEvents(req: Request, res: Response): Promise<void> {
  const events = await eventService.getMyJoinedEvents(req.user!._id.toString());
  ApiResponse.success(res, events);
}

export async function getNearbyEvents(req: Request, res: Response): Promise<void> {
  const params = nearbySchema.parse(req.query);
  const events = await eventService.getNearbyEvents(params);
  ApiResponse.success(res, events);
}

export async function reportEvent(req: Request, res: Response): Promise<void> {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
  await eventService.reportEvent(req.params.id!, req.user!._id.toString(), reason);
  ApiResponse.success(res, null, 'Event reported successfully');
}

export async function requestDeleteEvent(req: Request, res: Response): Promise<void> {
  const { reason } = requestDeleteSchema.parse(req.body ?? {});
  const event = await eventService.requestEventDeletion(req.params.id!, req.user!._id.toString(), reason);
  ApiResponse.success(res, event, 'Deletion request sent to admin for approval');
}

export async function verifyAttendee(req: Request, res: Response): Promise<void> {
  const { attendeeId, verificationCode } = verifyAttendeeSchema.parse(req.body ?? {});
  const event = await eventService.verifyAttendeeRsvp(
    req.params.id!,
    req.user!._id.toString(),
    attendeeId,
    verificationCode
  );
  ApiResponse.success(res, event, 'Attendee verification marked successful');
}

export async function getSimilarEvents(req: Request, res: Response): Promise<void> {
  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit as string) || 4));
  const events = await eventService.getSimilarEvents(req.params.id!, limit);
  ApiResponse.success(res, events);
}

const updateEventSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  date: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  venue: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
    }),
  }).optional(),
  maxAttendees: z.number().min(1).optional(),
}).strict();

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const parseResult = updateEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    ApiResponse.error(res, 400, 'INVALID_DATA', parseResult.error.errors[0]?.message || 'Invalid data');
    return;
  }

  const event = await eventService.updateEvent(
    req.params.id!,
    req.user!._id.toString(),
    parseResult.data
  );
  ApiResponse.success(res, event, 'Event updated successfully');
}

export async function getMyDraftEvents(req: Request, res: Response): Promise<void> {
  const events = await eventService.getMyDraftEvents(req.user!._id.toString());
  ApiResponse.success(res, events);
}

export async function submitDraft(req: Request, res: Response): Promise<void> {
  const event = await eventService.submitDraft(req.params.id!, req.user!._id.toString());
  ApiResponse.success(res, event, 'Event submitted for approval');
}

export async function getEventAnalytics(req: Request, res: Response): Promise<void> {
  const analytics = await eventService.getEventAnalytics(req.params.id!, req.user!._id.toString());
  ApiResponse.success(res, analytics);
}
