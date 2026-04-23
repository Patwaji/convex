export type EventCategory = 'tech' | 'corporate' | 'social' | 'sports' | 'arts' | 'education' | 'health' | 'other';

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  tags?: string[];
  date: string;
  endDate?: string;
  venue: {
    address: string;
    city: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  organizer: {
    _id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  coverImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  maxAttendees?: number;
  attendeeCount: number;
  attendees?: Array<{
    _id: string;
    name?: string;
    avatar?: string;
    verificationCode?: string;
    verified?: boolean;
  }>;
  reportCount?: number;
  isFlagged?: boolean;
  flagReason?: string;
  deletionRequest?: {
    status: 'none' | 'pending' | 'rejected';
    reason?: string;
    requestedAt?: string;
    reviewedAt?: string;
    adminNote?: string;
  };
  myVerificationCode?: string;
  rejectionNote?: string;
  isRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
}
