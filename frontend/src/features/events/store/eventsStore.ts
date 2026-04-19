import { create } from 'zustand';

export type EventCategory = 'tech' | 'corporate' | 'social' | 'sports' | 'arts' | 'education' | 'health' | 'other' | 'all';

interface EventsState {
  filterCategory: EventCategory;
  setFilterCategory: (category: EventCategory) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  filterCategory: 'all',
  
  setFilterCategory: (category) => {
    set({ filterCategory: category });
  },
}));
