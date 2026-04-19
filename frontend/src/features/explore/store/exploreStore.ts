import { create } from 'zustand';

interface Location {
  latitude: number;
  longitude: number;
}

interface ExploreState {
  userLocation: Location | null;
  radius: number; // in meters
  setUserLocation: (location: Location) => void;
  setRadius: (radius: number) => void;
}

export const useExploreStore = create<ExploreState>((set) => ({
  userLocation: null,
  radius: 10000, // default 10km
  
  setUserLocation: (location) => {
    set({ userLocation: location });
  },
  
  setRadius: (radius) => {
    set({ radius });
  },
}));
