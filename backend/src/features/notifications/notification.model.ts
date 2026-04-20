import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 
  | 'event_approved'
  | 'event_rejected'
  | 'event_flagged_info_request'
  | 'event_info_submitted'
  | 'event_joined'
  | 'event_left';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    eventId?: string;
    eventTitle?: string;
    flagReason?: string;
    adminNote?: string;
  };
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'event_approved',
        'event_rejected',
        'event_flagged_info_request',
        'event_info_submitted',
        'event_joined',
        'event_left',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      eventId: String,
      eventTitle: String,
      flagReason: String,
      adminNote: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);