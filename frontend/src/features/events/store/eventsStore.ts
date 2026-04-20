import { create } from 'zustand';

export type EventCategory = 'tech' | 'corporate' | 'social' | 'sports' | 'arts' | 'education' | 'health' | 'other' | 'all';
export type EventThemeCategory = Exclude<EventCategory, 'all'>;

interface EventsState {
  filterCategory: EventCategory;
  activeDetailCategory: EventThemeCategory | null;
  setFilterCategory: (category: EventCategory) => void;
  setActiveDetailCategory: (category: EventThemeCategory) => void;
  clearActiveDetailCategory: () => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  filterCategory: 'all',
  activeDetailCategory: null,
  
  setFilterCategory: (category) => {
    set({ filterCategory: category });
  },

  setActiveDetailCategory: (category) => {
    set({ activeDetailCategory: category });
  },

  clearActiveDetailCategory: () => {
    set({ activeDetailCategory: null });
  },
}));
