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
  radius: number; // meters
}

function normalizeOrganizer(organizer: any) {
  if (!organizer) {
    return null;
  }

  if (typeof organizer === 'object' && organizer._id) {
    return {
      _id: organizer._id.toString(),
      name: organizer.name,
      avatar: organizer.avatar,
      email: organizer.email,
    };
  }

  return { _id: organizer.toString() };
}

function normalizeAttendees(attendees: any[] | undefined) {
  if (!Array.isArray(attendees)) return [];
  return attendees.map((attendee) => {
    if (typeof attendee === 'object' && attendee._id) {
      return {
        _id: attendee._id.toString(),
        name: attendee.name,
        avatar: attendee.avatar,
      };
    }

    return { _id: attendee.toString() };
  });
}

function toEventSummary(event: any) {
  const attendeeCount = Array.isArray(event.attendees)
    ? event.attendees.length
    : Number(event.attendeeCount ?? 0);

  return {
    _id: event._id.toString(),
    title: event.title,
    description: event.description,
    category: event.category,
    tags: event.tags ?? [],
    coverImage: event.coverImage,
    date: event.date,
    endDate: event.endDate,
    venue: event.venue,
    isFree: event.isFree,
    ticketPrice: event.ticketPrice ?? 0,
    maxAttendees: event.maxAttendees,
    attendeeCount,
    organizer: normalizeOrganizer(event.organizer),
    status: event.status,
    isFlagged: event.isFlagged,
    flagReason: event.flagReason,
    reportCount: event.reportCount ?? 0,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function toEventDetail(event: any) {
  const attendees = normalizeAttendees(event.attendees);

  return {
    ...toEventSummary(event),
    attendees,
    reports: event.reports,
    rejectionNote: event.rejectionNote,
    additionalProof: event.additionalProof,
  };
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

  const mappedEvents = events.map(toEventSummary);

  return {
    events: mappedEvents,
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
export async function getEventById(eventId: string) {
  const event = await Event.findById(eventId)
    .populate('organizer', 'name avatar email')
    .populate('attendees', 'name avatar');

  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  return toEventDetail(event.toObject());
}

/**
 * Create a new event (status defaults to 'pending').
 * Auto-flags events that need extra review.
 */
export async function createEvent(
  organizerId: string,
  data: CreateEventData
){
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
  } else if (!data.venue?.address || !data.venue?.city) {
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

  const populated = await event.populate('organizer', 'name avatar');
  return toEventSummary(populated.toObject());
}

/**
 * Join an event (RSVP).
 */
export async function joinEvent(eventId: string, userId: string) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const updatedEvent = await Event.findOneAndUpdate(
    {
      _id: eventId,
      status: 'approved',
      attendees: { $ne: userObjId },
      $expr: {
        $or: [
          { $eq: ['$maxAttendees', null] },
          { $lt: [{ $size: '$attendees' }, '$maxAttendees'] },
        ],
      },
    },
    {
      $addToSet: { attendees: userObjId },
    },
    { new: true }
  );

  if (!updatedEvent) {
    const event = await Event.findById(eventId).lean();

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

    if ((event.attendees || []).some((a: any) => a.toString() === userId)) {
      const error = new Error('You have already joined this event') as any;
      error.statusCode = 409;
      error.code = 'ALREADY_JOINED';
      throw error;
    }

    const error = new Error('Event is full - maximum attendees reached') as any;
    error.statusCode = 409;
    error.code = 'EVENT_FULL';
    throw error;
  }

  const userUpdate = await User.updateOne(
    { _id: userId },
    { $addToSet: { joinedEvents: updatedEvent._id } }
  );

  if (userUpdate.matchedCount === 0) {
    await Event.findByIdAndUpdate(eventId, { $pull: { attendees: userObjId } });
    const error = new Error('User not found') as any;
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return getEventById(eventId);
}

/**
 * Leave an event.
 */
export async function leaveEvent(eventId: string, userId: string) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const updatedEvent = await Event.findOneAndUpdate(
    { _id: eventId, attendees: userObjId },
    { $pull: { attendees: userObjId } },
    { new: true }
  );

  if (!updatedEvent) {
    const event = await Event.findById(eventId).lean();
    if (!event) {
      const error = new Error('Event not found') as any;
      error.statusCode = 404;
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }

    const error = new Error('You have not joined this event') as any;
    error.statusCode = 400;
    error.code = 'NOT_JOINED';
    throw error;
  }

  const userUpdate = await User.updateOne(
    { _id: userId },
    { $pull: { joinedEvents: updatedEvent._id } }
  );

  if (userUpdate.matchedCount === 0) {
    await Event.findByIdAndUpdate(eventId, { $addToSet: { attendees: userObjId } });
    const error = new Error('User not found') as any;
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return getEventById(eventId);
}

/**
 * Report an event once per user.
 */
export async function reportEvent(eventId: string, userId: string, reason?: string) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (event.reports.some((report) => report.reporter.equals(userObjId))) {
    const error = new Error('You have already reported this event') as any;
    error.statusCode = 409;
    error.code = 'ALREADY_REPORTED';
    throw error;
  }

  event.reports.push({
    reporter: userObjId,
    reason: reason?.trim() || 'Reported by user',
    createdAt: new Date(),
  });
  event.reportCount = event.reports.length;

  if (event.reportCount >= 3 && !event.isFlagged) {
    event.isFlagged = true;
    event.flagReason = 'Multiple user reports';
  }

  await event.save();
}

/**
 * Get events created by the current user (includes pending/rejected).
 */
export async function getMyCreatedEvents(userId: string) {
  const events = await Event.find({ organizer: userId })
    .sort({ createdAt: -1 })
    .populate('organizer', 'name avatar')
    .lean();

  return events.map(toEventSummary);
}

/**
 * Get events the current user has joined.
 */
export async function getMyJoinedEvents(userId: string) {
  const events = await Event.find({ attendees: userId, status: 'approved' })
    .sort({ date: -1 })
    .populate('organizer', 'name avatar')
    .lean();

  return events.map(toEventSummary);
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
          coordinates: [lng, lat], // [longitude, latitude] - MongoDB convention
        },
        $maxDistance: radius,
      },
    },
  })
    .limit(50)
    .populate('organizer', 'name avatar')
    .lean();

  return events.map(toEventSummary);
}
