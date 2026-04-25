import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Dimensions, BackHandler } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FastImage from 'react-native-fast-image';
import { format } from 'date-fns';
import Icon from '../../../shared/components/AppIcon';

import { apiClient } from '../../../shared/api/client';
import { useEventsStore } from '../store/eventsStore';
import { getStylesForCategory, categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';
import { UserStackParamList } from '../../../navigation/types';

type JoinedEventsNavigationProp = StackNavigationProp<UserStackParamList, 'JoinedEvents'>;

const { width } = Dimensions.get('window');

interface JoinedEvent {
  _id: string;
  event?: any;
  verificationCode?: string;
  status?: string;
  createdAt?: string;

  title?: string;
  category?: string;
  date?: string;
  coverImage?: string;
  venue?: any;
}

export default function JoinedEventsScreen() {
  const navigation = useNavigation<JoinedEventsNavigationProp>();
  const filterCategory = useEventsStore(state => state.filterCategory);
  const setActiveDetailCategory = useEventsStore(state => state.setActiveDetailCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const theme = categoryThemes[activeCategory];
  const [selectedEvent, setSelectedEvent] = useState<JoinedEvent | null>(null);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }

    navigation.navigate('Tabs', { screen: 'Home' });
    return true;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => backHandler.remove();
    }, [handleBack])
  );

  const { data: events, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['joined-events'],
    queryFn: async () => {
      const res = await apiClient.get('/events/joined');
      return res.data.data as JoinedEvent[];
    },
  });

  const renderEventCard = ({ item }: { item: JoinedEvent }) => {
    const event = item.event || item;
    if (!event || !event._id) return null;

    const eventCategory = (event.category || 'other') as EventCategory;
    const eventTheme = categoryThemes[eventCategory];
    const eventStyles = getStylesForCategory(eventCategory);

    return (
      <TouchableOpacity
        style={[styles.card, eventStyles.card]}
        onPress={() => {
          setActiveDetailCategory(eventCategory);
          navigation.navigate('EventDetail', { id: event._id, category: eventCategory });
        }}
      >
        <FastImage
          style={styles.cardImage}
          source={{ uri: event.coverImage }}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.cardContent}>
          <View style={[styles.categoryBadge, { backgroundColor: eventTheme.accent }]}>
            <Text style={styles.categoryBadgeText}>
              {(event.category || 'other').toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.cardTitle, eventStyles.title]} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={[styles.cardDate, { color: eventTheme.textSecondary }]}>
            {format(new Date(event.date), 'MMMM d, yyyy • h:mm a')}
          </Text>
          <Text style={[styles.cardVenue, { color: eventTheme.textSecondary }]} numberOfLines={1}>
            📍 {event.venue?.address || event.venue?.city}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.qrButton, { backgroundColor: eventTheme.accent }]}
          onPress={() => setSelectedEvent(item)}
        >
          <Icon name="qr-code" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Joined Events</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your RSVPs and verification codes
          </Text>
        </View>
      </View>

      {events?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.surface }]}>
            <Icon name="calendar-plus" size={48} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            No events joined yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Find events and join to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}

      <Modal visible={!!selectedEvent} animationType="slide" transparent onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedEvent(null)}>
              <Icon name="x" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {selectedEvent?.event?.title || selectedEvent?.title}
            </Text>
            <View style={[styles.qrCode, { backgroundColor: '#FFFFFF' }]}>
              <Text style={styles.qrCodeText}>{selectedEvent?.verificationCode}</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Show this code at the event entrance
            </Text>
            <Text style={[styles.modalStatus, { color: theme.accent }]}>
              {selectedEvent?.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 56, paddingBottom: 16 },
  backBtn: { padding: 4 },
  titleSection: { flex: 1, marginLeft: 12 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  listContent: { padding: 16, paddingTop: 8 },
  card: { flexDirection: 'row', padding: 12, borderRadius: 16, marginBottom: 12 },
  cardImage: { width: 72, height: 72, borderRadius: 12 },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  categoryBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardDate: { fontSize: 12, marginBottom: 2 },
  cardVenue: { fontSize: 11 },
  qrButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  modalClose: { position: 'absolute', top: 12, right: 12, padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  qrCode: { padding: 16, borderRadius: 12, marginBottom: 12 },
  qrCodeText: { fontSize: 24, fontWeight: '700', letterSpacing: 2 },
  modalSubtitle: { fontSize: 12, marginBottom: 8 },
  modalStatus: { fontSize: 14, fontWeight: '600' },
});
