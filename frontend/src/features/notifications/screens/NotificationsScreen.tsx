import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '../../../shared/components/AppIcon';
import { formatDistanceToNow } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

import { apiClient } from '../../../shared/api/client';
import { useEventsStore } from '../../events/store/eventsStore';
import { getStylesForCategory, categoryThemes, CategoryTheme } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../../events/types';
import { useNotificationStore, Notification } from '../store/notificationStore';

interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

interface Props {
  adminTheme?: CategoryTheme;
}

export default function NotificationsScreen({ adminTheme }: Props) {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const categoryTheme = categoryThemes[activeCategory];
  const theme = adminTheme || categoryTheme;
  const isAdmin = !!adminTheme;
  const { unreadCount, setUnreadCount, markAsRead } = useNotificationStore();

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showModal, setShowModal] = useState(false);

  const styles = isAdmin ? adminStyles : defaultStyles;

  const { data, isLoading, refetch, isRefetching } = useQuery<NotificationsData>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data.data as NotificationsData;
    },
  });

  useEffect(() => {
    if (data?.unreadCount !== undefined) {
      setUnreadCount(data.unreadCount);
    }
  }, [data?.unreadCount, setUnreadCount]);

  const markReadMutation = useMutation({
    mutationFn: async (ids: string[]) => apiClient.post('/notifications/mark-read', { notificationIds: ids }),
    onSuccess: (_response, ids) => {
      markAsRead(ids);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => apiClient.post('/notifications/mark-read', {}),
    onSuccess: () => {
      markAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate([notification._id]);
    }
    setSelectedNotification(notification);
    setShowModal(true);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event_approved': return { icon: 'check-circle', color: '#10B981' };
      case 'event_rejected': return { icon: 'x-circle', color: '#EF4444' };
      case 'event_flagged_info_request': return { icon: 'alert-triangle', color: '#F59E0B' };
      case 'event_info_submitted': return { icon: 'send', color: '#3B82F6' };
      case 'event_joined': return { icon: 'user-plus', color: '#8B5CF6' };
      case 'event_left': return { icon: 'user-minus', color: '#6B7280' };
      default: return { icon: 'bell', color: theme.accent };
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const { icon, color } = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: theme.surface },
          !item.read && isAdmin && { borderLeftWidth: 3, borderLeftColor: theme.accent }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: isAdmin ? color + '15' : color + '20' }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: theme.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.notificationMessage, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />
        )}
      </TouchableOpacity>
    );
  };

  const closeDetailsModal = () => {
    setShowModal(false);
    setSelectedNotification(null);
  };

  const handleModalPrimaryAction = () => {
    if (!selectedNotification) return;

    if (!isAdmin && selectedNotification.type === 'event_flagged_info_request' && selectedNotification.data?.eventId) {
      closeDetailsModal();
      navigation.navigate('SubmitAdditionalInfo', { eventId: selectedNotification.data.eventId });
      return;
    }

    closeDetailsModal();
  };

  return (
    <View style={[styles.container, isAdmin ? { backgroundColor: theme.background } : categoryStyles.container]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdmin && <View style={{ width: 4, height: 24, backgroundColor: theme.accent, borderRadius: 2 }} />}
            <Text style={[styles.title, isAdmin && { color: theme.textPrimary, letterSpacing: 2 }]}>
              {isAdmin ? 'ALERTS' : 'Notifications'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.markAllButton, { borderColor: theme.accent }]}
                onPress={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <Text style={[styles.markAllButtonText, { color: theme.accent }]}>
                  {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                </Text>
              </TouchableOpacity>
            )}
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: isAdmin ? theme.accent : theme.accent }]}>
                <Text style={[styles.badgeText, { color: theme.accentText }]}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount <= 0 && (
            <View style={styles.headerActions} />
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : data?.notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="bell-off" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {isAdmin ? 'No pending alerts' : 'No notifications yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data?.notifications || []}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.accent}
              progressBackgroundColor={theme.surface}
            />
          }
        />
      )}

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeDetailsModal}>
        <View style={sharedStyles.modalOverlay}>
          <View
            style={[
              sharedStyles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border.color,
              },
            ]}
          >
            <View style={sharedStyles.modalHeader}>
              <Text style={[sharedStyles.modalTitle, { color: theme.textPrimary }]}>
                {selectedNotification?.title || 'Notification'}
              </Text>
              <TouchableOpacity onPress={closeDetailsModal} style={sharedStyles.closeButton}>
                <Icon name="x" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[sharedStyles.modalMessage, { color: theme.textSecondary }]}>
              {selectedNotification?.message || ''}
            </Text>

            <Text style={[sharedStyles.modalTime, { color: theme.textSecondary }]}>
              {selectedNotification?.createdAt
                ? formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true })
                : ''}
            </Text>

            <TouchableOpacity
              style={[sharedStyles.modalActionButton, { backgroundColor: theme.accent }]}
              onPress={handleModalPrimaryAction}
            >
              <Text style={[sharedStyles.modalActionText, { color: theme.accentText }]}>
                {!isAdmin && selectedNotification?.type === 'event_flagged_info_request' && selectedNotification?.data?.eventId
                  ? 'Submit Additional Info'
                  : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const sharedStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 10,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  modalTime: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalActionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

const defaultStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 32, fontWeight: '800' },
  markAllButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  markAllButtonText: { fontSize: 11, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  loader: { marginTop: 50 },
  list: { padding: 16, paddingTop: 0 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  notificationMessage: { fontSize: 12, marginBottom: 4, lineHeight: 16 },
  notificationTime: { fontSize: 10 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 15, marginTop: 16 },
});

const adminStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090F' },
  header: { padding: 20, paddingTop: 50, paddingBottom: 12, backgroundColor: '#07090F' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: 1, color: '#EAECF0' },
  markAllButton: { borderWidth: 1, borderRadius: 999, borderColor: '#00F0FF60', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#00F0FF12' },
  markAllButtonText: { fontSize: 10, fontWeight: '700', color: '#00F0FF', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#00F0FF40', backgroundColor: '#00F0FF15' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#00F0FF' },
  loader: { marginTop: 50 },
  list: { padding: 12, paddingTop: 0, backgroundColor: '#07090F' },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E2636',
    backgroundColor: '#0E1119',
  },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: '#00F0FF15' },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 13, fontWeight: '600', marginBottom: 3, color: '#EAECF0' },
  notificationMessage: { fontSize: 11, marginBottom: 3, lineHeight: 14, color: '#64748B' },
  notificationTime: { fontSize: 10, color: '#3F4756' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F0FF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, backgroundColor: '#07090F' },
  emptyText: { fontSize: 14, marginTop: 16, color: '#64748B' },
});
