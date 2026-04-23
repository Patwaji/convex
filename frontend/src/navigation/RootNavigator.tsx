import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../shared/components/AppIcon';
import { CustomBottomTabBar } from '../shared/components/BottomNav';
import { useQuery } from '@tanstack/react-query';

import { AuthStackParamList, AppTabsParamList, RootStackParamList, UserStackParamList } from './types';
import { useAuthStore } from '../features/auth/store/authStore';
import { apiClient } from '../shared/api/client';
import { useNotificationStore } from '../features/notifications/store/notificationStore';
import { categoryThemes, CategoryTheme } from '../shared/theme/categoryThemes';
import GlobalThemedAlertHost from '../shared/components/GlobalThemedAlertHost';

import LoginScreen from '../features/auth/screens/LoginScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import EventListScreen from '../features/events/screens/EventListScreen';
import EventDetailScreen from '../features/events/screens/EventDetailScreen';
import CreateEventScreen from '../features/events/screens/CreateEventScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import ExploreScreen from '../features/explore/screens/ExploreScreen';
import MyEventsScreen from '../features/events/screens/MyEventsScreen';
import JoinedEventsScreen from '../features/events/screens/JoinedEventsScreen';
import ProfileScreen from '../features/events/screens/ProfileScreen';
import EditProfileScreen from '../features/events/screens/EditProfileScreen';
import AdminScreen from '../features/admin/screens/AdminScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import SubmitAdditionalInfoScreen from '../features/notifications/screens/SubmitAdditionalInfoScreen';

const ADMIN_THEME: CategoryTheme = {
  ...categoryThemes.other,
  name: 'Admin',
};

const APP_THEME = categoryThemes.other;

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabsParamList>();
const UserStack = createStackNavigator<UserStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: 'transparent' },
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
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
          backgroundColor: 'transparent',
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

const UserTabsNavigator = () => {
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const theme = APP_THEME;

  return (
    <AppTabs.Navigator
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <AppTabs.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size - 1} color={color} />,
        }}
      />
      <AppTabs.Screen 
        name="Find" 
        component={ExploreScreen}
        options={{ 
          title: 'Find',
          tabBarIcon: ({ color, size }) => <Icon name="compass" size={size - 1} color={color} />,
        }}
      />
      <AppTabs.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ 
          title: 'Alerts',
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
          tabBarIcon: ({ color, size }) => <Icon name="user" size={size - 1} color={color} />,
        }} 
      />
    </AppTabs.Navigator>
  );
};

const UserRootNavigator = () => (
  <UserStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' } }}>
    <UserStack.Screen name="Tabs" component={UserTabsNavigator} />
    <UserStack.Screen name="EventList" component={EventListScreen} />
    <UserStack.Screen name="EventDetail" component={EventDetailScreen} />
    <UserStack.Screen name="CreateEvent" component={CreateEventScreen} />
    <UserStack.Screen name="SubmitAdditionalInfo" component={SubmitAdditionalInfoScreen} />
    <UserStack.Screen name="JoinedEvents" component={JoinedEventsScreen} />
    <UserStack.Screen name="MyEvents" component={MyEventsScreen} />
    <UserStack.Screen name="EditProfile" component={EditProfileScreen} />
  </UserStack.Navigator>
);

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

  return isAdmin ? <AdminNavigator /> : <UserRootNavigator />;
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: APP_THEME.background }}>
        <ActivityIndicator size="large" color={APP_THEME.accent} />
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