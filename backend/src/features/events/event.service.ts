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
  maxAttendees?: number;
}

interface PaginationParams {
  page: number;
  limit: number;
  category?: string;
  hobbies?: string[];
  search?: string;
  dateFilter?: 'today' | 'week' | 'month';
  sort?: 'date' | 'popularity';
}

const HOBBY_TO_CATEGORY_MAP: Record<string, string[]> = {
  'Technology': ['tech', 'education'],
  'Gaming': ['tech', 'social'],
  'Sports': ['sports', 'health'],
  'Music': ['arts', 'social'],
  'Art': ['arts', 'social'],
  'Reading': ['education', 'arts'],
  'Travel': ['social', 'sports'],
  'Cooking': ['social', 'health'],
  'Fitness': ['health', 'sports'],
  'Photography': ['arts', 'social'],
  'Movies': ['arts', 'social'],
  'Writing': ['education', 'arts'],
  'Dancing': ['arts', 'sports'],
  'Science': ['tech', 'education'],
  'Nature': ['social', 'sports'],
  'Fashion': ['arts', 'social'],
  'Food': ['social', 'health'],
  'Volunteering': ['social', 'education'],
  'Crafts': ['arts', 'social'],
  'Tech': ['tech', 'corporate'],
};

interface NearbyParams {
  lat: number;
  lng: number;
  radius: number; // meters
}

let lastExpiryCleanupAt = 0;

function createVerificationCode(userId: string, eventId: string): string {
  const userPart = userId.slice(-4).toUpperCase();
  const eventPart = eventId.slice(-4).toUpperCase();
  const nonce = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CVX-${eventPart}-${userPart}-${nonce}`;
}

async function cleanupExpiredEventsIfNeeded(): Promise<void> {
  const now = Date.now();
  if (now - lastExpiryCleanupAt < 60 * 1000) {
    return;
  }
  lastExpiryCleanupAt = now;

  const expiredEvents = await Event.find({ date: { $lte: new Date() } })
    .select('_id')
    .lean();

  if (!expiredEvents.length) return;

  const expiredIds = expiredEvents.map((event) => event._id);

  await Promise.all([
    Event.deleteMany({ _id: { $in: expiredIds } }),
    User.updateMany(
      { createdEvents: { $in: expiredIds } },
      { $pull: { createdEvents: { $in: expiredIds } } }
    ),
    User.updateMany(
      { joinedEvents: { $in: expiredIds } },
      { $pull: { joinedEvents: { $in: expiredIds } } }
    ),
  ]);
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
    maxAttendees: event.maxAttendees,
    attendeeCount,
    organizer: normalizeOrganizer(event.organizer),
    status: event.status,
    isFlagged: event.isFlagged,
    flagReason: event.flagReason,
    deletionRequest: event.deletionRequest
      ? {
          status: event.deletionRequest.status,
          reason: event.deletionRequest.reason,
          requestedAt: event.deletionRequest.requestedAt,
          reviewedAt: event.deletionRequest.reviewedAt,
          adminNote: event.deletionRequest.adminNote,
        }
      : { status: 'none' },
    reportCount: event.reportCount ?? 0,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function toEventDetail(event: any) {
  const attendees = normalizeAttendees(event.attendees);
  const paidRsvps = Array.isArray(event.paidRsvps) ? event.paidRsvps : [];

  return {
    ...toEventSummary(event),
    attendees,
    paidRsvps,
    reports: event.reports,
    rejectionNote: event.rejectionNote,
    additionalProof: event.additionalProof,
  };
}

/**
 * List approved events with optional category filter and pagination.
 */
export async function listEvents(params: PaginationParams) {
  await cleanupExpiredEventsIfNeeded();
  const { page, limit, category, hobbies, search, dateFilter, sort } = params;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status: 'approved' };
  if (category) {
    filter.category = category;
  }

  // Search by title, description, venue address, or organizer name
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { 'venue.address': searchRegex },
    ];
  }

  // Date range filter
  if (dateFilter) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (dateFilter === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() + 7);
    } else if (dateFilter === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() + 1);
    }

    if (startDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
  }

  // Sort options
  let sortOption: Record<string, 1 | -1> = { date: -1 };
  if (sort === 'popularity') {
    sortOption = { attendeeCount: -1, date: -1 };
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar')
      .lean(),
    Event.countDocuments(filter),
  ]);

  let mappedEvents = events.map(e => ({
    ...toEventSummary(e),
    attendeeCount: e.attendees?.length || 0,
  }));

  if (hobbies && hobbies.length > 0) {
    const matchingCategories = new Set<string>();
    hobbies.forEach(hobby => {
      const cats = HOBBY_TO_CATEGORY_MAP[hobby];
      if (cats) {
        cats.forEach(c => matchingCategories.add(c));
      }
    });

    mappedEvents = mappedEvents.map(event => ({
      ...event,
      isRecommended: matchingCategories.has(event.category),
    }));

    const recommended = mappedEvents.filter(e => e.isRecommended);
    const other = mappedEvents.filter(e => !e.isRecommended);
    mappedEvents = [...recommended, ...other];
  }

  // Remove attendeeCount from response after sorting by popularity (internal only)
  if (sort !== 'popularity') {
    mappedEvents = mappedEvents.map(e => {
      const { attendeeCount, ...rest } = e;
      return rest;
    });
  }

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
export async function getEventById(eventId: string, viewerId?: string) {
  await cleanupExpiredEventsIfNeeded();
  const event = await Event.findById(eventId)
    .populate('organizer', 'name avatar email')
    .populate('attendees', 'name avatar gender dateOfBirth');

  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  const detail = toEventDetail(event.toObject());
  const rsvps = Array.isArray(detail.paidRsvps) ? detail.paidRsvps : [];

  const myRsvp = viewerId
    ? rsvps.find((rsvp: any) => rsvp?.attendee?.toString?.() === viewerId || rsvp?.attendee?._id?.toString?.() === viewerId)
    : undefined;

  const organizerId = detail.organizer?._id?.toString?.();
  const isOrganizerView = !!viewerId && organizerId === viewerId;

  if (isOrganizerView) {
    const attendeesWithVerification = (detail.attendees || []).map((attendee: any) => {
      const record = rsvps.find((rsvp: any) => {
        const attendeeId = rsvp?.attendee?._id?.toString?.() || rsvp?.attendee?.toString?.();
        return attendeeId === attendee._id;
      });

      return {
        ...attendee,
        verificationCode: record?.verificationCode,
        verified: !!record?.verified,
      };
    });

    detail.attendees = attendeesWithVerification;
  }

  (detail as any).myVerificationCode = myRsvp?.verificationCode;
  delete (detail as any).paidRsvps;

  return detail;
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
  await cleanupExpiredEventsIfNeeded();
  const userObjId = new mongoose.Types.ObjectId(userId);

  const preEvent = await Event.findById(eventId).lean();
  if (!preEvent) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (preEvent.status !== 'approved') {
    const error = new Error('Cannot join an event that is not approved') as any;
    error.statusCode = 400;
    error.code = 'EVENT_NOT_APPROVED';
    throw error;
  }

  const isAlreadyJoined = (preEvent.attendees || []).some((a: any) => {
  const attendeeStr = a?.toString?.() || String(a || '');
  const matches = attendeeStr === userId;
  if (matches) {
    console.log('DETECTED: Already joined - attendee:', attendeeStr, '=== userId:', userId);
  }
  return matches;
});

if (isAlreadyJoined) {
  const error = new Error('You have already joined this event') as any;
  error.statusCode = 409;
  error.code = 'ALREADY_JOINED';
  throw error;
}

// Simple approach - just add directly
const updatedEvent = await Event.findByIdAndUpdate(
  eventId,
  {
    $addToSet: { attendees: userObjId },
    $push: {
      paidRsvps: {
        attendee: userObjId,
        verificationCode: createVerificationCode(userId, eventId),
        verified: false,
        createdAt: new Date(),
      },
    },
  },
  { new: true }
);

  if (!updatedEvent) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
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

  return getEventById(eventId, userId);
}

/**
 * Leave an event.
 */
export async function leaveEvent(eventId: string, userId: string) {
  await cleanupExpiredEventsIfNeeded();
  const userObjId = new mongoose.Types.ObjectId(userId);

  const updatedEvent = await Event.findOneAndUpdate(
    { _id: eventId, attendees: userObjId },
    {
      $pull: {
        attendees: userObjId,
        paidRsvps: { attendee: userObjId },
      },
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

  return getEventById(eventId, userId);
}

/**
 * Report an event once per user.
 */
export async function reportEvent(eventId: string, userId: string, reason?: string) {
  await cleanupExpiredEventsIfNeeded();
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
 * Get events created by the current user (includes pending/rejected/draft).
 */
export async function getMyCreatedEvents(userId: string) {
  await cleanupExpiredEventsIfNeeded();
  const events = await Event.find({ organizer: userId, status: { $ne: 'draft' } })
    .sort({ createdAt: -1 })
    .populate('organizer', 'name avatar')
    .lean();

  return events.map(toEventSummary);
}

/**
 * Get draft events created by the current user.
 */
export async function getMyDraftEvents(userId: string) {
  await cleanupExpiredEventsIfNeeded();
  const events = await Event.find({ organizer: userId, status: 'draft' })
    .sort({ createdAt: -1 })
    .populate('organizer', 'name avatar')
    .lean();

  return events.map(toEventSummary);
}

/**
 * Get events the current user has joined.
 */
export async function getMyJoinedEvents(userId: string) {
  console.log('getMyJoinedEvents called with userId:', userId);
  await cleanupExpiredEventsIfNeeded();
  const userObjId = new mongoose.Types.ObjectId(userId);
  console.log('userObjId:', userObjId);
  const events = await Event.find({ attendees: userObjId, status: 'approved' })
    .sort({ date: -1 })
    .populate('organizer', 'name avatar')
    .lean();
  console.log('Found events:', events.length);

  return events.map(toEventSummary);
}

/**
 * Update an event (only by organizer, only for drafts or pending).
 */
export async function updateEvent(eventId: string, userId: string, data: Partial<CreateEventData>) {
  const event = await Event.findById(eventId);
  
  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (event.organizer.toString() !== userId) {
    const error = new Error('Not authorized to update this event') as any;
    error.statusCode = 403;
    error.code = 'NOT_AUTHORIZED';
    throw error;
  }

  if (event.status !== 'draft' && event.status !== 'pending') {
    const error = new Error('Can only update draft or pending events') as any;
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    throw error;
  }

  if (data.title) event.title = data.title;
  if (data.description) event.description = data.description;
  if (data.category) event.category = data.category;
  if (data.tags) event.tags = data.tags;
  if (data.coverImage) event.coverImage = data.coverImage;
  if (data.date) event.date = new Date(data.date);
  if (data.endDate) event.endDate = new Date(data.endDate);
  if (data.venue) event.venue = data.venue;
  if (data.maxAttendees) event.maxAttendees = data.maxAttendees;

  await event.save();

  return toEventSummary(event.toObject());
}

/**
 * Submit a draft for admin approval.
 */
export async function submitDraft(eventId: string, userId: string) {
  const event = await Event.findById(eventId);
  
  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (event.organizer.toString() !== userId) {
    const error = new Error('Not authorized') as any;
    error.statusCode = 403;
    error.code = 'NOT_AUTHORIZED';
    throw error;
  }

  if (event.status !== 'draft') {
    const error = new Error('Can only submit draft events') as any;
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    throw error;
  }

  event.status = 'pending';
  await event.save();

  return toEventSummary(event.toObject());
}

/**
 * Geo search: find nearby approved events within a radius.
 * Uses MongoDB $nearSphere with the 2dsphere index.
 */
export async function getNearbyEvents(params: NearbyParams) {
  await cleanupExpiredEventsIfNeeded();
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

/**
 * Organizer can request event deletion. Admin must review it.
 */
export async function requestEventDeletion(eventId: string, organizerId: string, reason?: string) {
  await cleanupExpiredEventsIfNeeded();
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (event.organizer.toString() !== organizerId) {
    const error = new Error('You can only request deletion for your own events') as any;
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (event.deletionRequest?.status === 'pending') {
    const error = new Error('Deletion request is already pending admin approval') as any;
    error.statusCode = 409;
    error.code = 'DELETE_REQUEST_ALREADY_PENDING';
    throw error;
  }

  event.deletionRequest = {
    status: 'pending',
    reason: reason?.trim() || 'Organizer requested deletion',
    requestedAt: new Date(),
    reviewedAt: undefined,
    reviewedBy: undefined,
    adminNote: undefined,
  } as any;
  await event.save();

  return toEventSummary(event.toObject());
}

/**
 * Organizer verifies a check-in by matching attendee verification code.
 */
export async function verifyAttendeeRsvp(
  eventId: string,
  organizerId: string,
  attendeeId: string,
  verificationCode: string
) {
  await cleanupExpiredEventsIfNeeded();
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  if (event.organizer.toString() !== organizerId) {
    const error = new Error('Only organizer can verify attendees') as any;
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const rsvpRecord = event.paidRsvps.find((record: any) => record.attendee.toString() === attendeeId);
  if (!rsvpRecord) {
    const error = new Error('Attendee RSVP not found') as any;
    error.statusCode = 404;
    error.code = 'RSVP_NOT_FOUND';
    throw error;
  }

  if (rsvpRecord.verificationCode !== verificationCode.trim()) {
    const error = new Error('Verification code does not match attendee record') as any;
    error.statusCode = 400;
    error.code = 'INVALID_VERIFICATION_CODE';
    throw error;
  }

  rsvpRecord.verified = true;
  await event.save();

  return getEventById(eventId, organizerId);
}

/**
 * Get similar events based on category, excluding current event
 */
export async function getSimilarEvents(eventId: string, limit: number) {
  await cleanupExpiredEventsIfNeeded();
  
  const currentEvent = await Event.findById(eventId).select('category').lean();
  if (!currentEvent) {
    const error = new Error('Event not found') as any;
    error.statusCode = 404;
    error.code = 'EVENT_NOT_FOUND';
    throw error;
  }

  const events = await Event.find({
    _id: { $ne: eventId },
    category: currentEvent.category,
    status: 'approved',
    date: { $gte: new Date() },
  })
    .sort({ date: 1 })
    .limit(limit)
    .populate('organizer', 'name avatar')
    .lean();

  return events.map(toEventSummary);
}


export async function getEventAnalytics(eventId: string, userId: string) {
  const event = await Event.findById(eventId);
  
  if (!event) {
    const error = new Error("Event not found") as any;
    error.statusCode = 404;
    error.code = "EVENT_NOT_FOUND";
    throw error;
  }

  if (event.organizer.toString() !== userId) {
    const error = new Error("Not authorized") as any;
    error.statusCode = 403;
    error.code = "NOT_AUTHORIZED";
    throw error;
  }

  await Event.findByIdAndUpdate(eventId, { $inc: { viewCount: 1 } });

  const verifiedCount = event.paidRsvps?.filter((rsvp: any) => rsvp.verified)?.length || 0;
  const pendingCount = (event.attendees?.length || 0) - verifiedCount;

  return {
    viewCount: (event.viewCount || 0) + 1,
    totalRsvps: event.attendees?.length || 0,
    verifiedCount,
    pendingVerification: pendingCount,
    maxAttendees: event.maxAttendees,
    isFull: event.maxAttendees ? event.attendees?.length >= event.maxAttendees : false,
    reportCount: event.reportCount,
    status: event.status,
  };
}
