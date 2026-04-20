import React from 'react';

import ThemedAlert from './ThemedAlert';
import { useGlobalAlertStore } from '../store/globalAlertStore';
import { categoryThemes, CategoryTheme, EventCategory } from '../theme/categoryThemes';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useEventsStore } from '../../features/events/store/eventsStore';

const ADMIN_ALERT_THEME: CategoryTheme = {
  name: 'Admin',
  background: '#0B0F1A',
  surface: '#151B2B',
  accent: '#00F0FF',
  accentText: '#0B0F1A',
  textPrimary: '#E8ECF1',
  textSecondary: '#6B7280',
  borderRadius: 6,
  cardElevation: 0,
  fontFamily: { title: 'System', body: 'System', mono: 'System' },
  glow: { color: '#00F0FF', opacity: 0.6, blur: 20 },
  border: { width: 1, color: '#00F0FF20', style: 'solid' },
  shadow: { color: '#00F0FF', opacity: 0.3, offset: { x: 0, y: 4 }, radius: 12 },
  iconSet: 'Feather',
};

export default function GlobalThemedAlertHost() {
  const { visible, type, title, message, confirmText, onConfirm, hide } = useGlobalAlertStore();
  const user = useAuthStore((state) => state.user);
  const filterCategory = useEventsStore((state) => state.filterCategory);
  const activeDetailCategory = useEventsStore((state) => state.activeDetailCategory);

  let resolvedTheme = categoryThemes.other;

  if (user?.role === 'admin') {
    resolvedTheme = ADMIN_ALERT_THEME;
  } else if (activeDetailCategory) {
    resolvedTheme = categoryThemes[activeDetailCategory];
  } else {
    const fallbackCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
    resolvedTheme = categoryThemes[fallbackCategory];
  }

  return (
    <ThemedAlert
      visible={visible}
      type={type}
      title={title}
      message={message}
      theme={resolvedTheme}
      onClose={hide}
      confirmText={confirmText}
      onConfirm={onConfirm}
    />
  );
}
