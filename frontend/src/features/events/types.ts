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
  ticketPrice: number;
  isFree: boolean;
  status: 'pending' | 'approved' | 'rejected';
  maxAttendees?: number;
  attendeeCount: number;
  attendees?: Array<{
    _id: string;
    name?: string;
    avatar?: string;
  }>;
  reportCount?: number;
  isFlagged?: boolean;
  flagReason?: string;
  rejectionNote?: string;
  createdAt: string;
  updatedAt: string;
}
