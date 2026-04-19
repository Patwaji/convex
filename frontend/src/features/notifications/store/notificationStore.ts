import { create } from 'zustand';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    eventId?: string;
    eventTitle?: string;
    flagReason?: string;
  };
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  markAsRead: (notificationIds?: string[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setLoading: (isLoading) => set({ isLoading }),
  markAsRead: (notificationIds) => set((state) => {
    if (!notificationIds) {
      return {
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      };
    }
    return {
      notifications: state.notifications.map(n => 
        notificationIds.includes(n._id) ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - notificationIds.length),
    };
  }),
}));