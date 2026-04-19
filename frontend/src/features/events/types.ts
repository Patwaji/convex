export type EventCategory = 'tech' | 'corporate' | 'social' | 'sports' | 'arts' | 'education' | 'health' | 'other';

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  venue: {
    name: string;
    address: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  organizer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  coverImage?: string;
  ticketPrice: number;
  isFree: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  capacity?: number;
  attendeeCount: number;
  createdAt: string;
  updatedAt: string;
}
