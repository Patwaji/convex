import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../auth/store/authStore';
import { useEventsStore } from '../store/eventsStore';
import { getStylesForCategory, categoryThemes, CategoryTheme } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';

interface Props {
  adminTheme?: CategoryTheme;
}

export default function ProfileScreen({ adminTheme }: Props) {
  const { user, logout } = useAuthStore();
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const categoryTheme = categoryThemes[activeCategory];
  const theme = adminTheme || categoryTheme;
  const isAdmin = !!adminTheme;

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, Record<string, string>> = {
      tech: { name: 'User ID', email: 'System Email', role: 'Access Level' },
      corporate: { name: 'Full Name', email: 'Work Email', role: 'Position' },
      social: { name: 'Username', email: 'Contact', role: 'Status' },
      sports: { name: 'Athlete Name', email: 'Team Email', role: 'Team Role' },
      arts: { name: 'Artist Name', email: 'Studio Email', role: 'Art Type' },
      education: { name: 'Student Name', email: 'Edu Email', role: 'Grade' },
      health: { name: 'Member Name', email: 'Health Email', role: 'Plan' },
      other: { name: 'Name', email: 'Email', role: 'Role' },
    };
    return labels[activeCategory]?.[field] || labels.other[field];
  };

  const styles = isAdmin ? adminStyles : defaultStyles;

  return (
    <View style={[styles.container, { backgroundColor: isAdmin ? theme.background : undefined }]}>
      <View style={styles.header}>
        {isAdmin && <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, color: theme.accent }}>A</Text>
        </View>}
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {isAdmin ? 'ADMIN PROFILE' : 'Profile'}
        </Text>
        {isAdmin && <View style={[styles.roleBadge, { backgroundColor: theme.accent + '20', borderColor: theme.accent }]}>
          <Text style={[styles.roleText, { color: theme.accent }]}>◆ SUPERUSER</Text>
        </View>}
      </View>
      
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{getFieldLabel('name')}</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{user?.name}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{getFieldLabel('email')}</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{user?.email}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{getFieldLabel('role')}</Text>
          <Text style={[styles.value, { color: theme.accent }]}>{user?.role?.toUpperCase()}</Text>
        </View>

        {isAdmin && (
          <View style={[styles.statsRow, { borderTopColor: theme.border.color }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.accent }]}>100%</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Uptime</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.accent }]}>24/7</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Access</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.accent }]}>✓</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Verified</Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.logoutBtn, { backgroundColor: isAdmin ? '#EF444420' : theme.accent, borderWidth: isAdmin ? 1 : 0, borderColor: '#EF4444' }]} 
        onPress={logout}
      >
        <Text style={[styles.logoutText, { color: isAdmin ? '#EF4444' : theme.accentText }]}>
          {isAdmin ? '◆ DISCONNECT' : 'Logout'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginTop: 8, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '600' },
  card: { padding: 20, borderRadius: 12, borderWidth: 1 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 4 },
  logoutBtn: { marginTop: 20, paddingVertical: 16, alignItems: 'center', borderRadius: 8 },
  logoutText: { fontSize: 16, fontWeight: '700' },
});

const adminStyles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, marginTop: 8, borderWidth: 1 },
  roleText: { fontSize: 9, fontWeight: '600' },
  card: { padding: 16, borderRadius: 8, borderWidth: 1 },
  field: { marginBottom: 14 },
  label: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  value: { fontSize: 14, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 9, marginTop: 3 },
  logoutBtn: { marginTop: 24, paddingVertical: 14, alignItems: 'center', borderRadius: 6 },
  logoutText: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
});