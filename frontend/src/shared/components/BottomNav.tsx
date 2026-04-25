import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './AppIcon';
import { PURPLE_THEME_BASE } from '../theme/categoryThemes';
import { useNotificationStore } from '../../features/notifications/store/notificationStore';

const { accent, surface, textSecondary } = PURPLE_THEME_BASE;

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Find: 'compass',
  Notifications: 'bell',
  Profile: 'user',
};

export function CustomBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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
          
          const iconName = TAB_ICONS[route.name] || 'circle';
          const showBadge = route.name === 'Notifications' && unreadCount > 0;
            
          return (
            <TouchableOpacity 
              key={route.key} 
              style={styles.tab} 
              onPress={onPress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon name={iconName} size={22} color={isFocused ? accent : textSecondary} />
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
    backgroundColor: surface,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    width: '76%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
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
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});