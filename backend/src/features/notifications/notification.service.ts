import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from './notification.model';

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: { eventId?: string; eventTitle?: string; flagReason?: string; adminNote?: string }
): Promise<INotification> {
  const notification = await Notification.create({
    user: new mongoose.Types.ObjectId(userId),
    type,
    title,
    message,
    data,
  });
  return notification;
}

export async function notifyAdminRequestedMoreProof(
  userId: string,
  eventId: string,
  eventTitle: string,
  adminNote?: string
): Promise<INotification> {
  return createNotification(
    userId,
    'event_flagged_info_request',
    '📋 More Proof Requested by Admin',
    adminNote
      ? `Admin requested more proof for "${eventTitle}". Note: ${adminNote}`
      : `Admin requested more proof for "${eventTitle}". Please submit additional information.`,
    { eventId, eventTitle, adminNote }
  );
}

export async function notifyEventInfoSubmitted(
  adminUserId: string,
  eventId: string,
  eventTitle: string
): Promise<INotification> {
  return createNotification(
    adminUserId,
    'event_info_submitted',
    '📝 Additional Proof Submitted',
    `Organizer submitted additional proof for "${eventTitle}". Please review.`,
    { eventId, eventTitle }
  );
}

/**
 * Notify user their event was approved
 */
export async function notifyEventApproved(
  userId: string,
  eventId: string,
  eventTitle: string
): Promise<INotification> {
  return createNotification(
    userId,
    'event_approved',
    '🎉 Event Approved!',
    `Your event "${eventTitle}" has been approved and is now live!`,
    { eventId, eventTitle }
  );
}

/**
 * Notify user their event was rejected
 */
export async function notifyEventRejected(
  userId: string,
  eventId: string,
  eventTitle: string,
  rejectionNote: string
): Promise<INotification> {
  return createNotification(
    userId,
    'event_rejected',
    '❌ Event Rejected',
    `Your event "${eventTitle}" was not approved. Reason: ${rejectionNote}`,
    { eventId, eventTitle }
  );
}

/**
 * Request additional info for flagged event
 */
export async function notifyFlaggedForReview(
  userId: string,
  eventId: string,
  eventTitle: string,
  flagReason: string
): Promise<INotification> {
  return createNotification(
    userId,
    'event_flagged_info_request',
    '📋 Additional Info Required',
    `Your event "${eventTitle}" needs additional verification. Reason: ${flagReason}. Please update your event with more details or contact support.`,
    { eventId, eventTitle, flagReason }
  );
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit = 20,
  offset = 0
): Promise<any[]> {
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ user: userId, read: false });
}

/**
 * Mark notifications as read
 */
export async function markAsRead(userId: string, notificationIds?: string[]): Promise<void> {
  const query: any = { user: userId, read: false };
  if (notificationIds && notificationIds.length > 0) {
    query._id = { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) };
  }
  await Notification.updateMany(query, { read: true });
}