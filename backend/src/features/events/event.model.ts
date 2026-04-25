import mongoose, { Document, Schema } from 'mongoose';

export const EVENT_CATEGORIES = [
  'tech',
  'corporate',
  'social',
  'sports',
  'arts',
  'education',
  'health',
  'other',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'draft';
export type DeleteRequestStatus = 'none' | 'pending' | 'rejected';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: EventCategory;
  tags: string[];
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
  attendees: mongoose.Types.ObjectId[];
  organizer: mongoose.Types.ObjectId;
  status: EventStatus;
  rejectionNote?: string;
  isFlagged: boolean;
  flagReason?: string;
  reportCount: number;
  reports: {
    reporter: mongoose.Types.ObjectId;
    reason: string;
    createdAt: Date;
  }[];
  additionalProof?: {
    additionalInfo: string;
    contactPhone?: string;
    contactEmail?: string;
    submittedAt: Date;
  };
  deletionRequest?: {
    status: DeleteRequestStatus;
    reason?: string;
    requestedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    adminNote?: string;
  };
  paidRsvps: {
    attendee: mongoose.Types.ObjectId;
    verificationCode: string;
    verified: boolean;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [120, 'Title must not exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      enum: {
        values: EVENT_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    coverImage: {
      type: String,
      default: undefined,
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    endDate: {
      type: Date,
      default: undefined,
    },
    venue: {
      address: {
        type: String,
        required: [true, 'Venue address is required'],
      },
      city: {
        type: String,
        required: [true, 'Venue city is required'],
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          required: [true, 'Coordinates are required'],
          validate: {
            validator: function (coords: number[]) {
              return (
                coords.length === 2 &&
                coords[0]! >= -180 &&
                coords[0]! <= 180 &&
                coords[1]! >= -90 &&
                coords[1]! <= 90
              );
            },
            message: 'Coordinates must be [longitude, latitude] with valid ranges',
          },
        },
      },
    },
    maxAttendees: {
      type: Number,
      min: [0, 'Max attendees must be 0 or more'],
      default: 0,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event organizer is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
    },
    rejectionNote: {
      type: String,
      default: undefined,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: undefined,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    reports: [
      {
        reporter: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    additionalProof: {
      additionalInfo: {
        type: String,
        default: undefined,
      },
      contactPhone: {
        type: String,
        default: undefined,
      },
      contactEmail: {
        type: String,
        default: undefined,
      },
      submittedAt: {
        type: Date,
        default: undefined,
      },
    },
    deletionRequest: {
      status: {
        type: String,
        enum: ['none', 'pending', 'rejected'],
        default: 'none',
      },
      reason: {
        type: String,
        default: undefined,
      },
      requestedAt: {
        type: Date,
        default: undefined,
      },
      reviewedAt: {
        type: Date,
        default: undefined,
      },
      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: undefined,
      },
      adminNote: {
        type: String,
        default: undefined,
      },
    },
    paidRsvps: [
      {
        attendee: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        verificationCode: {
          type: String,
          required: true,
          trim: true,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ─── CRITICAL: 2dsphere Index for Geo Queries ───────────────
// Without this index, $nearSphere queries will throw MongoServerError.
// Coordinates are [longitude, latitude] — NOT [lat, lng].
eventSchema.index({ 'venue.location': '2dsphere' });

// ─── Additional Indexes for Query Performance ───────────────
eventSchema.index({ status: 1, category: 1 });
eventSchema.index({ organizer: 1 });
// TTL index auto-removes documents once event start time is reached.
// MongoDB TTL monitor runs periodically, so deletion is near-real-time.
eventSchema.index({ date: 1 }, { expireAfterSeconds: 0 });
eventSchema.index({ status: 1, date: -1 });
eventSchema.index({ category: 1, status: 1, date: -1 });
eventSchema.index({ organizer: 1, createdAt: -1 });
eventSchema.index({ attendees: 1, status: 1 });
eventSchema.index({ 'deletionRequest.status': 1, status: 1, createdAt: -1 });

// ─── Transform: Clean JSON output ──────────────────────────
eventSchema.set('toJSON', {
  transform(_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export const Event = mongoose.model<IEvent>('Event', eventSchema);
