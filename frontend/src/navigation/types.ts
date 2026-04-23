import { NavigatorScreenParams } from '@react-navigation/native';
// Navigation types

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type EventsStackParamList = {
  EventList: undefined;
  EventDetail: { id: string, category?: string };
  CreateEvent: { draftId?: string } | undefined;
  SubmitAdditionalInfo: { eventId: string };
  JoinedEvents: undefined;
  MyEvents: undefined;
  EditProfile: undefined;
};

export type NotificationsStackParamList = {
  NotificationsList: undefined;
  SubmitAdditionalInfo: { eventId: string };
};

export type AppTabsParamList = {
  Home: undefined;
  Find: undefined;
  Notifications: undefined;
  Profile: undefined;
  Admin: undefined;
};

export type UserStackParamList = {
  Tabs: NavigatorScreenParams<AppTabsParamList>;
  EventList: undefined;
  EventDetail: { id: string, category?: string };
  CreateEvent: { draftId?: string } | undefined;
  SubmitAdditionalInfo: { eventId: string };
  JoinedEvents: undefined;
  MyEvents: undefined;
  EditProfile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<UserStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
