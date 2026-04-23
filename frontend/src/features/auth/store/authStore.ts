import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;
  hobbies?: string[];
  joinedEvents: any[];
  createdEvents: any[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true while we check async storage
  
  login: async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem('@access_token', accessToken);
    await AsyncStorage.setItem('@refresh_token', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('@access_token');
    await AsyncStorage.removeItem('@refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: (user) => {
    set({ user, isAuthenticated: true, isLoading: false });
  },

  updateUser: (patch) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
    }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  }
}));
