import { NavigatorScreenParams } from '@react-navigation/native';
// Navigation types

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type EventsStackParamList = {
  EventList: undefined;
  EventDetail: { id: string, category?: string };
  CreateEvent: undefined;
  SubmitAdditionalInfo: { eventId: string };
};

export type NotificationsStackParamList = {
  NotificationsList: undefined;
  SubmitAdditionalInfo: { eventId: string };
};

export type AppTabsParamList = {
  EventsTab: NavigatorScreenParams<EventsStackParamList>;
  Explore: undefined;
  MyEvents: undefined;
  Notifications: undefined;
  Profile: undefined;
  Admin: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabsParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
