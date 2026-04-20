import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';

import { AuthStackParamList, AppTabsParamList, RootStackParamList, EventsStackParamList } from './types';
import { useAuthStore } from '../features/auth/store/authStore';
import { useEventsStore } from '../features/events/store/eventsStore';
import { apiClient } from '../shared/api/client';
import { useNotificationStore } from '../features/notifications/store/notificationStore';
import { categoryThemes, EventCategory, CategoryTheme } from '../shared/theme/categoryThemes';
import GlobalThemedAlertHost from '../shared/components/GlobalThemedAlertHost';

import LoginScreen from '../features/auth/screens/LoginScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import EventListScreen from '../features/events/screens/EventListScreen';
import EventDetailScreen from '../features/events/screens/EventDetailScreen';
import CreateEventScreen from '../features/events/screens/CreateEventScreen';
import ExploreScreen from '../features/explore/screens/ExploreScreen';
import MyEventsScreen from '../features/events/screens/MyEventsScreen';
import ProfileScreen from '../features/events/screens/ProfileScreen';
import AdminScreen from '../features/admin/screens/AdminScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import SubmitAdditionalInfoScreen from '../features/notifications/screens/SubmitAdditionalInfoScreen';

const ADMIN_THEME: CategoryTheme = {
  name: 'Admin',
  background: '#0B0F1A',
  surface: '#151B2B',
  accent: '#00F0FF',
  accentText: '#0B0F1A',
  textPrimary: '#E8ECF1',
  textSecondary: '#6B7280',
  borderRadius: 4,
  cardElevation: 0,
  fontFamily: { title: 'System', body: 'System', mono: 'System' },
  glow: { color: '#00F0FF', opacity: 0.6, blur: 20 },
  border: { width: 1, color: '#00F0FF20', style: 'solid' },
  shadow: { color: '#00F0FF', opacity: 0.3, offset: { x: 0, y: 4 }, radius: 12 },
  iconSet: 'Feather',
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const EventsStack = createStackNavigator<EventsStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabsParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

const AUTH_THEME = {
  dark: true,
  colors: {
    primary: '#00F0FF',
    background: '#0A0A0F',
    card: '#12121A',
    text: '#E8ECF1',
    border: '#2D2D3A',
    notification: '#00F0FF',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};

const AuthNavigator = () => (
  <AuthStack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#F8FAFC' },
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

const EventsNavigator = () => (
  <EventsStack.Navigator screenOptions={{ headerShown: false }}>
    <EventsStack.Screen name="EventList" component={EventListScreen} />
    <EventsStack.Screen name="EventDetail" component={EventDetailScreen} />
    <EventsStack.Screen name="CreateEvent" component={CreateEventScreen} />
    <EventsStack.Screen name="SubmitAdditionalInfo" component={SubmitAdditionalInfoScreen} />
  </EventsStack.Navigator>
);

const AdminNotificationsScreen = () => {
  return <NotificationsScreen adminTheme={ADMIN_THEME} />;
};

const AdminProfileScreen = () => {
  return <ProfileScreen adminTheme={ADMIN_THEME} />;
};

function NotificationTabIcon({
  color,
  size,
  showDot,
  backgroundColor,
}: {
  color: string;
  size: number;
  showDot: boolean;
  backgroundColor: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 32, borderRadius: 8, backgroundColor }}>
      <Icon name="bell" size={size - 2} color={color} />
      {showDot ? <View style={styles.notificationDot} /> : null}
    </View>
  );
}

const AdminNavigator = () => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <AppTabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: ADMIN_THEME.accent,
        tabBarInactiveTintColor: ADMIN_THEME.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: ADMIN_THEME.background,
          borderTopWidth: 0,
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
      }}
    >
      <AppTabs.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          title: 'COMMAND',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 32, borderRadius: 8, backgroundColor: color + '15' }}>
              <Icon name="hexagon" size={size - 2} color={color} />
            </View>
          ),
        }}
      />
      <AppTabs.Screen
        name="Notifications"
        component={AdminNotificationsScreen}
        options={{
          title: 'ALERTS',
          tabBarIcon: ({ color, size }) => (
            <NotificationTabIcon
              color={color}
              size={size}
              showDot={unreadCount > 0}
              backgroundColor={color + '15'}
            />
          ),
        }}
      />
      <AppTabs.Screen
        name="Profile"
        component={AdminProfileScreen}
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 32, borderRadius: 8, backgroundColor: color + '15' }}>
              <Icon name="user" size={size - 2} color={color} />
            </View>
          ),
        }}
      />
    </AppTabs.Navigator>
  );
};

const UserNavigator = () => {
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeDetailCategory = useEventsStore(state => state.activeDetailCategory);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const isTech = filterCategory === 'tech';
  const isCorporate = filterCategory === 'corporate';
  const isSocial = filterCategory === 'social';
  const isSports = filterCategory === 'sports';
  const isArts = filterCategory === 'arts';
  const isEducation = filterCategory === 'education';
  const isHealth = filterCategory === 'health';
  const isOther = filterCategory === 'other' || filterCategory === 'all';
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const theme = activeDetailCategory ? categoryThemes[activeDetailCategory] : categoryThemes[activeCategory];

  const getTabBarStyle = () => ({
    backgroundColor: theme.background,
    borderTopColor: theme.border.color,
    borderTopWidth: theme.border.width,
    height: 65,
  });

  const getEventEmoji = () => {
    if (isTech) return '💻';
    if (isCorporate) return '🏢';
    if (isSocial) return '🎉';
    if (isSports) return '⚽';
    if (isArts) return '🎨';
    if (isEducation) return '📚';
    if (isHealth) return '🏥';
    return '📅';
  };

  const getExploreEmoji = () => {
    if (isTech) return '🔭';
    if (isCorporate) return '🌐';
    if (isSocial) return '📍';
    if (isSports) return '🏟️';
    if (isArts) return '🖼️';
    if (isEducation) return '🏫';
    if (isHealth) return '🩺';
    return '🗺️';
  };

  const getMyEventsEmoji = () => {
    if (isTech) return '💾';
    if (isCorporate) return '🤝';
    if (isSocial) return '❤️';
    if (isSports) return '🏆';
    if (isArts) return '🎭';
    if (isEducation) return '📖';
    if (isHealth) return '🧘';
    return '🔖';
  };

  return (
    <AppTabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarStyle: getTabBarStyle(),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          fontStyle: isArts ? 'italic' : 'normal',
          letterSpacing: isTech || isSocial || isEducation ? 1 : 0,
        },
      }}
    >
      <AppTabs.Screen 
        name="EventsTab" 
        component={EventsNavigator} 
        options={{ 
          title: isTech ? 'EVENTS' : isCorporate ? 'NETWORK' : isSocial ? '🎉 Events' : isSports ? 'GAMES' : isArts ? 'GALLERY' : isEducation ? 'COURSES' : isHealth ? 'WELLNESS' : isOther ? 'EVENTS' : 'Events',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size * 0.7, color }}>{getEventEmoji()}</Text>,
        }} 
      />
      <AppTabs.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{ 
          title: isTech ? 'NEARBY' : isCorporate ? 'DISCOVER' : isSocial ? '📍 Nearby' : isSports ? 'ARENAS' : isArts ? 'EXHIBIT' : isEducation ? 'CAMPUS' : isHealth ? 'CENTERS' : isOther ? 'FIND' : 'Explore',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size * 0.7, color }}>{getExploreEmoji()}</Text>,
        }}
      />
      <AppTabs.Screen 
        name="MyEvents" 
        component={MyEventsScreen} 
        options={{ 
          title: isTech ? 'SAVED' : isCorporate ? 'CONNECT' : isSocial ? '❤️ Saved' : isSports ? 'TEAMS' : isArts ? 'COLLECT' : isEducation ? 'ENROLLED' : isHealth ? 'MY SESSIONS' : isOther ? 'SAVED' : 'Saved',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size * 0.7, color }}>{getMyEventsEmoji()}</Text>,
        }} 
      />
      <AppTabs.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ 
          title: isTech ? 'ALERTS' : isCorporate ? 'ALERTS' : isSocial ? '🔔' : isSports ? 'ALERTS' : isArts ? 'ALERTS' : isEducation ? 'ALERTS' : isHealth ? 'ALERTS' : isOther ? 'ALERTS' : 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 24 }}>
              <Icon name="bell" size={size - 1} color={color} />
              {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
            </View>
          ),
        }} 
      />
      <AppTabs.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size * 0.7, color }}>👤</Text>,
        }} 
      />
    </AppTabs.Navigator>
  );
};

const AppNavigator = () => {
  const { user } = useAuthStore();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const isAdmin = user?.role === 'admin';

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications_unread_count'],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data?.data?.count as number;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 5000,
  });

  useEffect(() => {
    if (typeof unreadCountData === 'number') {
      setUnreadCount(unreadCountData);
    }
  }, [unreadCountData, setUnreadCount]);

  return isAdmin ? <AdminNavigator /> : <UserNavigator />;
};

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, restoreSession, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        if (token) {
          const response = await apiClient.get('/auth/me');
          restoreSession(response.data.data);
        } else {
          setLoading(false);
        }
      } catch {
        await logout();
      }
    };
    bootstrapAsync();
  }, [logout, restoreSession, setLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
      <GlobalThemedAlertHost />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  notificationDot: {
    position: 'absolute',
    top: 3,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  techIconContainer: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
});