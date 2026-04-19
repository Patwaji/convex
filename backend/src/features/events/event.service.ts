import { Event, IEvent, EventCategory } from './event.model';
import { User } from '../users/user.model';
import mongoose from 'mongoose';
import * as notificationService from '../notifications/notification.service';

interface CreateEventData {
  title: string;
  description: string;
  category: EventCategory;
  tags?: string[];
  coverImage?: string;
  date: Date;
  endDate?: Date;
  venue: {
    name: string;
    address: string;
    city: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  isFree?: boolean;
  ticketPrice?: number;
  maxAttendees?: number;
}

interface PaginationParams {
  page: number;
  limit: number;
  category?: string;
}

interface NearbyParams {
  lat: number;
  lng: number;
  radius: number; // metres
}

/**
 * List approved events with optional category filter and pagination.
 */
export async function listEvents(params: PaginationParams) {
  const { page, limit, category } = params;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status: 'approved' };
  if (category) {
    filter.category = category;
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar')
      .lean(),
    Event.countDocuments(filter),
  ]);

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single event by ID with full details.
 */
export async function getEventById(eventId: string): Promise<IEvent> {
  const event = await Event.findById(eventId)
    .populate('organizer', 'name avatar email')
    .populate('attendees', 'name avatar');

  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  return event;
}

/**
 * Create a new event (status defaults to 'pending').
 * Auto-flags events that need extra review.
 */
export async function createEvent(
  organizerId: string,
  data: CreateEventData
): Promise<IEvent> {
  // Check if organizer is new (first event)
  const existingEvents = await Event.countDocuments({ organizer: organizerId });
  const isFirstEvent = existingEvents === 0;

  // Auto-flag logic for first-time organizers and incomplete events
  let isFlagged = false;
  let flagReason = undefined;

  if (isFirstEvent) {
    // First-time organizers: flag for extra review
    isFlagged = true;
    flagReason = 'First event from organizer - requires review';
  } else if (!data.coverImage) {
    // No cover image - flag for review
    isFlagged = true;
    flagReason = 'Missing cover image';
  } else if (!data.venue?.name || !data.venue?.address) {
    // Incomplete venue - flag for review
    isFlagged = true;
    flagReason = 'Incomplete venue information';
  } else if (data.description && data.description.length < 50) {
    // Very short description - flag for review
    isFlagged = true;
    flagReason = 'Too short description';
  }

  const event = await Event.create({
    ...data,
    organizer: new mongoose.Types.ObjectId(organizerId),
    status: 'pending',
    isFlagged,
    flagReason,
  });

  // If flagged, notify user they need to provide more info
  if (isFlagged && flagReason) {
    await notificationService.notifyFlaggedForReview(
      organizerId,
      event._id.toString(),
      event.title,
      flagReason
    );
  }

  // Add event to user's createdEvents
  await User.findByIdAndUpdate(organizerId, {
    $push: { createdEvents: event._id },
  });

  return event.populate('organizer', 'name avatar');
}

/**
 * Join an event (RSVP).
 */
export async function joinEvent(eventId: string, userId: string): Promise<IEvent> {
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (event.status !== 'approved') {
    const error = new Error('Cannot join an event that is not approved') as any;
    error.statusCode = 400;
    error.code = 'EVENT_NOT_APPROVED';
    throw error;
  }

  // Check if user already joined
  const userObjId = new mongoose.Types.ObjectId(userId);
  if (event.attendees.some((a) => a.equals(userObjId))) {
    const error = new Error('You have already joined this event') as any;
    error.statusCode = 409;
    error.code = 'ALREADY_JOINED';
    throw error;
  }

  // Check max attendees cap
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
    const error = new Error('Event is full — maximum attendees reached') as any;
    error.statusCode = 409;
    error.code = 'EVENT_FULL';
    throw error;
  }

  // Add user to attendees
  event.attendees.push(userObjId);
  await event.save();

  // Add event to user's joinedEvents
  await User.findByIdAndUpdate(userId, {
    $addToSet: { joinedEvents: event._id },
  });

  return event;
}

/**
 * Leave an event.
 */
export async function leaveEvent(eventId: string, userId: string): Promise<IEvent> {
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  const userObjId = new mongoose.Types.ObjectId(userId);
  if (!event.attendees.some((a) => a.equals(userObjId))) {
    const error = new Error('You have not joined this event') as any;
    error.statusCode = 400;
    error.code = 'NOT_JOINED';
    throw error;
  }

  // Remove user from attendees
  event.attendees = event.attendees.filter((a) => !a.equals(userObjId)) as any;
  await event.save();

  // Remove event from user's joinedEvents
  await User.findByIdAndUpdate(userId, {
    $pull: { joinedEvents: event._id },
  });

  return event;
}

/**
 * Get events created by the current user (includes pending/rejected).
 */
export async function getMyCreatedEvents(userId: string) {
  return Event.find({ organizer: userId })
    .sort({ createdAt: -1 })
    .populate('organizer', 'name avatar')
    .lean();
}

/**
 * Get events the current user has joined.
 */
export async function getMyJoinedEvents(userId: string) {
  return Event.find({ attendees: userId, status: 'approved' })
    .sort({ date: -1 })
    .populate('organizer', 'name avatar')
    .lean();
}

/**
 * Geo search: find nearby approved events within a radius.
 * Uses MongoDB $nearSphere with the 2dsphere index.
 */
export async function getNearbyEvents(params: NearbyParams) {
  const { lat, lng, radius } = params;

  const events = await Event.find({
    status: 'approved',
    'venue.location': {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat], // [longitude, latitude] — MongoDB convention
        },
        $maxDistance: radius,
      },
    },
  })
    .limit(50)
    .populate('organizer', 'name avatar')
    .lean();

  return events;
}
