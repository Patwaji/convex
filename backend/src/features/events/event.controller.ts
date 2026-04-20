import { Request, Response } from 'express';
import { z } from 'zod';
import * as eventService from './event.service';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { EVENT_CATEGORIES } from './event.model';

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
  isFree: z.boolean().optional().default(true),
  ticketPrice: z.number().min(0).optional(),
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

// ─── Controllers ────────────────────────────────────────────

export async function listEvents(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const category = req.query.category as string | undefined;

  const result = await eventService.listEvents({ page, limit, category });
  ApiResponse.paginated(res, result.events, result.pagination);
}

export async function getEventById(req: Request, res: Response): Promise<void> {
  const event = await eventService.getEventById(req.params.id!);
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

export async function joinEvent(req: Request, res: Response): Promise<void> {
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
