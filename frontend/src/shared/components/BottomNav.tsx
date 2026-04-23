import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './AppIcon';
import { PURPLE_THEME_BASE } from '../theme/categoryThemes';

const { accent, surface, textSecondary } = PURPLE_THEME_BASE;

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Find: 'compass',
  Notifications: 'bell',
  Profile: 'user',
};

export function CustomBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
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
            
          return (
            <TouchableOpacity 
              key={route.key} 
              style={styles.tab} 
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Icon name={iconName} size={22} color={isFocused ? accent : textSecondary} />
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
});