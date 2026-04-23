import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FastImage from 'react-native-fast-image';
import { format } from 'date-fns';
import Icon from '../../../shared/components/AppIcon';

import { apiClient } from '../../../shared/api/client';
import { useAuthStore } from '../../auth/store/authStore';
import { categoryThemes, getStylesForCategory } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../../events/types';
import { triggerGlobalAlert } from '../../../shared/store/globalAlertStore';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'flagged' | 'delete_requests';

type PaginatedResponse<T> = {
  items: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const THEME = {
  background: '#0B0F1A',
  surface: '#151B2B',
  accent: '#00F0FF',
  accentDim: '#00F0FF40',
  accentGlow: '#00F0FF30',
  textPrimary: '#E8ECF1',
  textSecondary: '#6B7280',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#00F0FF20',
};

const REJECTION_REASONS = [
  { id: 'fake', label: '✗ Fake or misleading event', isReal: true },
  { id: 'incomplete', label: '✗ Incomplete venue information', isReal: true },
  { id: 'spam', label: '✗ Spam or promotional content', isReal: true },
  { id: 'inappropriate', label: '✗ Inappropriate content', isReal: true },
  { id: 'wrong_category', label: '✗ Wrong category selected', isReal: true },
  { id: 'no_cover', label: '✗ Missing cover image', isReal: true },
  { id: 'naas', label: '◇ Random rejection (NaaS)', isReal: false },
];

export default function AdminScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; eventId: string | null }>({ visible: false, eventId: null });
  const [actionsModal, setActionsModal] = useState<{ visible: boolean; eventId: string | null }>({ visible: false, eventId: null });
  const [proofRequestModal, setProofRequestModal] = useState<{ visible: boolean; eventId: string | null }>({ visible: false, eventId: null });
  const [detailsModal, setDetailsModal] = useState<{ visible: boolean; event: any | null }>({ visible: false, event: null });
  const [requestSentModalVisible, setRequestSentModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [proofRequestNote, setProofRequestNote] = useState('');

  const fetchAdminEvents = async (path: string): Promise<PaginatedResponse<any>> => {
    const res = await apiClient.get(path, { params: { page: 1, limit: 25 } });
    return {
      items: res.data.data ?? [],
      pagination: res.data.pagination,
    };
  };

  const { data: pendingEvents, isLoading: loadingPending } = useQuery({
    queryKey: ['admin_events_pending'],
    queryFn: async () => fetchAdminEvents('/admin/events/pending'),
    enabled: user?.role === 'admin',
  });

  const { data: approvedEvents, isLoading: loadingApproved } = useQuery({
    queryKey: ['admin_events_approved'],
    queryFn: async () => fetchAdminEvents('/admin/events/approved'),
    enabled: user?.role === 'admin' && activeTab === 'approved',
  });

  const { data: rejectedEvents, isLoading: loadingRejected } = useQuery({
    queryKey: ['admin_events_rejected'],
    queryFn: async () => fetchAdminEvents('/admin/events/rejected'),
    enabled: user?.role === 'admin' && activeTab === 'rejected',
  });

  const { data: flaggedEvents, isLoading: loadingFlagged } = useQuery({
    queryKey: ['admin_events_flagged'],
    queryFn: async () => fetchAdminEvents('/admin/events/flagged'),
    enabled: user?.role === 'admin' && activeTab === 'flagged',
  });

  const { data: deleteRequestEvents, isLoading: loadingDeleteRequests } = useQuery({
    queryKey: ['admin_events_delete_requests'],
    queryFn: async () => fetchAdminEvents('/admin/events/delete-requests'),
    enabled: user?.role === 'admin' && activeTab === 'delete_requests',
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/admin/events/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events_pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin_events_approved'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      triggerGlobalAlert({
        type: 'success',
        title: '◆ APPROVED',
        message: 'Event has been published!',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => 
      apiClient.patch(`/admin/events/${id}/reject`, { rejectionNote: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events_pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin_events_rejected'] });
      setRejectModal({ visible: false, eventId: null });
      setSelectedReason(null);
      setCustomNote('');
      triggerGlobalAlert({
        type: 'warning',
        title: '◇ REJECTED',
        message: 'Event has been removed.',
      });
    },
  });

  const requestProofMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) =>
      apiClient.patch(`/admin/events/${id}/request-proof`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events_pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin_events_flagged'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setProofRequestModal({ visible: false, eventId: null });
      setActionsModal({ visible: false, eventId: null });
      setProofRequestNote('');
      setRequestSentModalVisible(true);
    },
  });

  const approveDeleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/admin/events/${id}/approve-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events_delete_requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin_events_approved'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      triggerGlobalAlert({
        type: 'success',
        title: '◆ DELETED',
        message: 'Event deleted after admin approval.',
      });
    },
  });

  const rejectDeleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/admin/events/${id}/reject-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_events_delete_requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin_events_approved'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      triggerGlobalAlert({
        type: 'info',
        title: '◇ REQUEST REJECTED',
        message: 'Delete request was rejected and event remains active.',
      });
    },
  });

  const handleReject = () => {
    if (!rejectModal.eventId || !selectedReason) return;
    let reason = customNote;
    if (selectedReason === 'naas') {
      reason = "My cat walked across the keyboard and decided no.";
    } else {
      const found = REJECTION_REASONS.find(r => r.id === selectedReason);
      reason = found ? found.label.replace('✗ ', '') : customNote;
    }
    rejectMutation.mutate({ id: rejectModal.eventId, reason });
  };

  const handleRequestProof = () => {
    if (!proofRequestModal.eventId) return;
    requestProofMutation.mutate({
      id: proofRequestModal.eventId,
      note: proofRequestNote.trim() || undefined,
    });
  };

  if (user?.role !== 'admin') {
    return (
      <View style={[styles.container, { backgroundColor: THEME.background }]}>
        <View style={styles.deniedContainer}>
          <View style={styles.deniedIcon}>
            <Icon name="shield-off" size={48} color={THEME.danger} />
          </View>
          <Text style={styles.deniedTitle}>ACCESS DENIED</Text>
          <Text style={styles.deniedSubtitle}>// ADMIN PREREQUISITE REQUIRED</Text>
        </View>
      </View>
    );
  }

  const getData = () => {
    switch (activeTab) {
      case 'pending': return pendingEvents?.items || [];
      case 'approved': return approvedEvents?.items || [];
      case 'rejected': return rejectedEvents?.items || [];
      case 'flagged': return flaggedEvents?.items || [];
      case 'delete_requests': return deleteRequestEvents?.items || [];
      default: return [];
    }
  };

  const isLoading = loadingPending || loadingApproved || loadingRejected || loadingFlagged || loadingDeleteRequests;
  const data = getData();

  const pendingCount = pendingEvents?.pagination?.total || pendingEvents?.items?.length || 0;
  const approvedToday = (approvedEvents?.items || []).filter((e: any) => {
    const created = new Date(e.updatedAt);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  }).length;
  const totalManaged =
    (pendingEvents?.pagination?.total || pendingEvents?.items?.length || 0) +
    (approvedEvents?.pagination?.total || approvedEvents?.items?.length || 0) +
    (rejectedEvents?.pagination?.total || rejectedEvents?.items?.length || 0);

  const TabButton = ({ tab, label, count, color }: { tab: FilterTab; label: string; count?: number; color: string }) => (
    <TouchableOpacity 
      style={[styles.tabButton, activeTab === tab && { backgroundColor: color + '20', borderColor: color }]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabLabel, activeTab === tab && { color }]}>
        {label.toUpperCase()}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: color }]}>
          <Text style={styles.tabBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEventCard = ({ item }: { item: any }) => {
    const eventCategory = (item.category || 'other') as EventCategory;
    const eventTheme = categoryThemes[eventCategory] || categoryThemes.other;
    const isNewOrganizer = item.organizer?.createdEventsCount <= 1;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.eventCard, { backgroundColor: THEME.surface, borderColor: THEME.border }]}
        onPress={() => setDetailsModal({ visible: true, event: item })}
      >
        <View style={styles.cardTop}>
          <FastImage
            source={{ uri: item.coverImage || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200' }}
            style={styles.thumbnail}
          />
          <View style={styles.cardMeta}>
            <View style={[styles.categoryTag, { backgroundColor: eventTheme.accent + '20', borderColor: eventTheme.accent }]}>
              <Text style={[styles.categoryText, { color: eventTheme.accent }]}>
                {eventCategory.toUpperCase()}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              {isNewOrganizer && (
                <View style={styles.newOrgBadge}>
                  <Text style={styles.newOrgText}>NEW ORG</Text>
                </View>
              )}
              {item.isFlagged && (
                <View style={[styles.flaggedTag, { backgroundColor: THEME.warning + '20' }]}>
                  <Icon name="alert-triangle" size={10} color={THEME.warning} />
                  <Text style={[styles.flaggedText, { color: THEME.warning }]}>FLAGGED</Text>
                </View>
              )}
            </View>
          </View>
          {activeTab === 'pending' && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setActionsModal({ visible: true, eventId: item._id })}
            >
              <Icon name="more-vertical" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.organizerInfo}>
          <FastImage
            source={{ uri: item.organizer?.avatar || `https://ui-avatars.com/api/?name=${item.organizer?.name}` }}
            style={styles.avatar}
          />
          <View style={styles.organizerDetails}>
            <Text style={styles.organizerName}>{item.organizer?.name}</Text>
            <Text style={styles.submitTime}>Submitted {format(new Date(item.createdAt), 'MMM d, HH:mm')}</Text>
          </View>
        </View>

        {item.rejectionNote && (
          <View style={[styles.rejectionBanner, { backgroundColor: THEME.danger + '10' }]}>
            <Icon name="x-circle" size={12} color={THEME.danger} />
            <Text style={styles.rejectionText}>{item.rejectionNote}</Text>
          </View>
        )}

        {activeTab === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: THEME.success + '20', borderColor: THEME.success }]}
              onPress={() => approveMutation.mutate(item._id)}
              disabled={approveMutation.isPending}
            >
              <Icon name="check" size={14} color={THEME.success} />
              <Text style={[styles.actionText, { color: THEME.success }]}>APPROVE</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: THEME.danger + '20', borderColor: THEME.danger }]}
              onPress={() => setRejectModal({ visible: true, eventId: item._id })}
              disabled={rejectMutation.isPending}
            >
              <Icon name="x" size={14} color={THEME.danger} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>REJECT</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'delete_requests' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: THEME.danger + '20', borderColor: THEME.danger }]}
              onPress={() => approveDeleteMutation.mutate(item._id)}
              disabled={approveDeleteMutation.isPending}
            >
              <Icon name="trash-2" size={14} color={THEME.danger} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>APPROVE DELETE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: THEME.success + '20', borderColor: THEME.success }]}
              onPress={() => rejectDeleteMutation.mutate(item._id)}
              disabled={rejectDeleteMutation.isPending}
            >
              <Icon name="corner-right-up" size={14} color={THEME.success} />
              <Text style={[styles.actionText, { color: THEME.success }]}>KEEP EVENT</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <View style={styles.iconBox}>
                <Icon name="command" size={20} color={THEME.accent} />
              </View>
              <Text style={styles.title}>COMMAND CENTER</Text>
            </View>
            <Text style={styles.subtitle}>// EVENT MODERATION SYSTEM v2.0</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderColor: THEME.danger + '40' }]}>
            <Text style={[styles.statValue, { color: THEME.danger }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>
          <View style={[styles.statBox, { borderColor: THEME.success + '40' }]}>
            <Text style={[styles.statValue, { color: THEME.success }]}>{approvedToday}</Text>
            <Text style={styles.statLabel}>TODAY</Text>
          </View>
          <View style={[styles.statBox, { borderColor: THEME.accent + '40' }]}>
            <Text style={[styles.statValue, { color: THEME.accent }]}>{totalManaged}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={[styles.statBox, { borderColor: THEME.warning + '40' }]}>
            <Text style={[styles.statValue, { color: THEME.warning }]}>{flaggedEvents?.pagination?.total || flaggedEvents?.items?.length || 0}</Text>
            <Text style={styles.statLabel}>FLAGGED</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
          <View style={styles.tabBar}>
            <TabButton tab="pending" label="Pending" count={pendingCount} color={THEME.danger} />
            <TabButton tab="approved" label="Approved" color={THEME.success} />
            <TabButton tab="rejected" label="Rejected" color={THEME.textSecondary} />
            <TabButton tab="flagged" label="Flagged" count={flaggedEvents?.pagination?.total || flaggedEvents?.items?.length} color={THEME.warning} />
            <TabButton tab="delete_requests" label="Delete Requests" count={deleteRequestEvents?.pagination?.total || deleteRequestEvents?.items?.length} color={THEME.danger} />
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={THEME.accent} />
            <Text style={styles.loadingText}>LOADING DATA...</Text>
          </View>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inbox" size={40} color={THEME.textSecondary} />
          <Text style={styles.emptyText}>NO EVENTS IN QUEUE</Text>
          <Text style={styles.emptySubtext}>// ALL CAUGHT UP</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>◇ REJECT EVENT</Text>
              <TouchableOpacity onPress={() => setRejectModal({ visible: false, eventId: null })}>
                <Icon name="x" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>// SELECT REJECTION REASON:</Text>

            {REJECTION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[styles.reasonRow, selectedReason === reason.id && { backgroundColor: THEME.danger + '10' }]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={[styles.radioDot, selectedReason === reason.id && { backgroundColor: THEME.danger }]} />
                <Text style={[styles.reasonText, selectedReason === reason.id && { color: THEME.danger }]}>
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.noteInput}
              placeholder="// Add custom rejection note..."
              placeholderTextColor={THEME.textSecondary}
              value={customNote}
              onChangeText={setCustomNote}
              multiline
            />

            <TouchableOpacity 
              style={[styles.rejectButton, !selectedReason && styles.rejectButtonDisabled]}
              onPress={handleReject}
              disabled={!selectedReason}
            >
              <Text style={styles.rejectButtonText}>CONFIRM REJECTION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={actionsModal.visible} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setActionsModal({ visible: false, eventId: null })}>
          <View style={styles.actionsModalContent}>
            <TouchableOpacity
              style={styles.actionsRow}
              onPress={() => {
                setProofRequestModal({ visible: true, eventId: actionsModal.eventId });
                setActionsModal({ visible: false, eventId: null });
              }}
            >
              <Icon name="alert-circle" size={16} color={THEME.warning} />
              <Text style={[styles.actionsText, { color: THEME.textPrimary }]}>Ask for more proof</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={proofRequestModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: THEME.warning }]}>◇ REQUEST MORE PROOF</Text>
              <TouchableOpacity onPress={() => setProofRequestModal({ visible: false, eventId: null })}>
                <Icon name="x" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>// OPTIONAL NOTE TO ORGANIZER:</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Example: please share booking link, website, or organizer identity proof"
              placeholderTextColor={THEME.textSecondary}
              value={proofRequestNote}
              onChangeText={setProofRequestNote}
              multiline
            />

            <TouchableOpacity
              style={[styles.rejectButton, requestProofMutation.isPending && styles.rejectButtonDisabled]}
              onPress={handleRequestProof}
              disabled={requestProofMutation.isPending}
            >
              <Text style={styles.rejectButtonText}>SEND REQUEST</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: THEME.accent }]}>◆ EVENT DETAILS</Text>
              <TouchableOpacity onPress={() => setDetailsModal({ visible: false, event: null })}>
                <Icon name="x" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={[styles.reasonText, { fontSize: 16, marginBottom: 8 }]}>{detailsModal.event?.title}</Text>
              <Text style={[styles.modalSubtitle, { marginBottom: 8 }]}>ORGANIZER</Text>
              <Text style={styles.reasonText}>{detailsModal.event?.organizer?.name || '-'}</Text>
              <Text style={[styles.modalSubtitle, { marginTop: 14, marginBottom: 8 }]}>FLAG STATUS</Text>
              <Text style={styles.reasonText}>{detailsModal.event?.flagReason || 'Not flagged'}</Text>

              <Text style={[styles.modalSubtitle, { marginTop: 14, marginBottom: 8 }]}>ADDITIONAL PROOF</Text>
              {detailsModal.event?.additionalProof?.additionalInfo ? (
                <View>
                  <Text style={styles.reasonText}>{detailsModal.event.additionalProof.additionalInfo}</Text>
                  {!!detailsModal.event.additionalProof.contactPhone && (
                    <Text style={[styles.reasonText, { marginTop: 8 }]}>Phone: {detailsModal.event.additionalProof.contactPhone}</Text>
                  )}
                  {!!detailsModal.event.additionalProof.contactEmail && (
                    <Text style={[styles.reasonText, { marginTop: 4 }]}>Email: {detailsModal.event.additionalProof.contactEmail}</Text>
                  )}
                  {!!detailsModal.event.additionalProof.submittedAt && (
                    <Text style={[styles.reasonText, { marginTop: 4, color: THEME.textSecondary }]}>Submitted {format(new Date(detailsModal.event.additionalProof.submittedAt), 'MMM d, HH:mm')}</Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.reasonText, { color: THEME.textSecondary }]}>No additional proof submitted yet.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={requestSentModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconWrap}>
              <Icon name="send" size={20} color={THEME.accent} />
            </View>
            <Text style={styles.successTitle}>◆ REQUEST SENT</Text>
            <Text style={styles.successMessage}>Organizer has been asked for additional proof.</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setRequestSentModalVisible(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  deniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deniedIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  deniedTitle: { fontSize: 24, fontWeight: '700', color: '#EF4444', letterSpacing: 3 },
  deniedSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 8, letterSpacing: 1 },

  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { marginBottom: 16 },
  titleBlock: {},
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#00F0FF20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00F0FF40' },
  title: { fontSize: 20, fontWeight: '700', color: '#E8ECF1', letterSpacing: 2 },
  subtitle: { fontSize: 10, color: '#6B7280', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#151B2B', borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 9, color: '#6B7280', marginTop: 4, letterSpacing: 1 },

  tabScroll: { marginHorizontal: -16 },
  tabScrollContent: { paddingHorizontal: 16, paddingRight: 26 },
  tabBar: { flexDirection: 'row', gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6, backgroundColor: '#151B2B', borderWidth: 1, borderColor: '#00F0FF20', gap: 8 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 1 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: '#0B0F1A' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderBox: { alignItems: 'center' },
  loadingText: { fontSize: 12, color: '#00F0FF', marginTop: 16, letterSpacing: 2 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16, letterSpacing: 1 },
  emptySubtext: { fontSize: 10, color: '#6B7280', marginTop: 4 },

  listContent: { padding: 16, paddingBottom: 100 },

  eventCard: { marginBottom: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', padding: 10, gap: 10 },
  thumbnail: { width: 70, height: 50, borderRadius: 6 },
  cardMeta: { flex: 1, justifyContent: 'center', gap: 6 },
  categoryTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  categoryText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  moreButton: { marginLeft: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F1A' },
  newOrgBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  newOrgText: { fontSize: 7, fontWeight: '700', color: '#F59E0B', letterSpacing: 0.5 },
  flaggedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  flaggedText: { fontSize: 7, fontWeight: '700', letterSpacing: 0.5 },

  eventTitle: { fontSize: 14, fontWeight: '600', color: '#E8ECF1', paddingHorizontal: 10, marginBottom: 8 },
  organizerInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8, marginBottom: 10 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  organizerDetails: {},
  organizerName: { fontSize: 12, fontWeight: '600', color: '#E8ECF1' },
  submitTime: { fontSize: 9, color: '#6B7280' },

  rejectionBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, marginHorizontal: 10, marginBottom: 10, borderRadius: 4 },
  rejectionText: { fontSize: 11, color: '#EF4444', flex: 1 },

  cardActions: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#00F0FF10' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 24 },
  modalContent: { backgroundColor: '#151B2B', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  successModalCard: { backgroundColor: '#151B2B', borderRadius: 14, borderWidth: 1, borderColor: '#00F0FF30', padding: 18 },
  successIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#00F0FF15', borderWidth: 1, borderColor: '#00F0FF40', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#00F0FF', letterSpacing: 1, marginBottom: 8 },
  successMessage: { fontSize: 13, color: '#E8ECF1', lineHeight: 19, marginBottom: 16 },
  successButton: { alignSelf: 'flex-end', backgroundColor: '#00F0FF20', borderWidth: 1, borderColor: '#00F0FF60', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  successButtonText: { color: '#00F0FF', fontWeight: '700', letterSpacing: 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#EF4444', letterSpacing: 1 },
  modalSubtitle: { fontSize: 11, color: '#6B7280', marginBottom: 16, letterSpacing: 1 },
  actionsModalContent: { backgroundColor: '#151B2B', borderRadius: 12, marginHorizontal: 20, marginBottom: 120, borderWidth: 1, borderColor: '#00F0FF20' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  actionsText: { fontSize: 14, fontWeight: '600' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#00F0FF10' },
  radioDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#6B7280', marginRight: 12 },
  reasonText: { fontSize: 14, color: '#E8ECF1', flex: 1 },
  noteInput: { backgroundColor: '#0B0F1A', borderRadius: 8, padding: 14, color: '#E8ECF1', marginTop: 16, minHeight: 60, fontSize: 14 },
  rejectButton: { backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  rejectButtonDisabled: { backgroundColor: '#6B7280' },
  rejectButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});