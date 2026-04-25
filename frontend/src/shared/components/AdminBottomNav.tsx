import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './AppIcon';
import { useNotificationStore } from '../../features/notifications/store/notificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ADMIN_THEME = {
  background: '#07090F',
  surface: '#0E1119',
  accent: '#00F0FF',
  textPrimary: '#EAECF0',
  textSecondary: '#64748B',
  border: '#1E2636',
};

const ADMIN_TAB_ICONS: Record<string, string> = {
  Admin: 'command',
  Notifications: 'bell',
  Profile: 'user',
};

export function AdminBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          const iconName = ADMIN_TAB_ICONS[route.name] || 'circle';
          const showBadge = route.name === 'Notifications' && unreadCount > 0;
            
          return (
            <TouchableOpacity 
              key={route.key} 
              style={styles.tab} 
              onPress={onPress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon 
                  name={iconName} 
                  size={22} 
                  color={isFocused ? ADMIN_THEME.accent : ADMIN_THEME.textSecondary} 
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: ADMIN_THEME.surface,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    width: '86%',
    borderWidth: 1,
    borderColor: ADMIN_THEME.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: ADMIN_THEME.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
