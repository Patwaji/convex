import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FastImage from 'react-native-fast-image';
import { format } from 'date-fns';

import { apiClient } from '../../../shared/api/client';
import { useEventsStore } from '../store/eventsStore';
import { getStylesForCategory, categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';
import { EventsStackParamList } from '../../../navigation/types';

type MyEventsNavigationProp = StackNavigationProp<EventsStackParamList>;

export default function MyEventsScreen() {
  const navigation = useNavigation<MyEventsNavigationProp>();
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const theme = categoryThemes[activeCategory];

  const { data: events, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const res = await apiClient.get('/events/me');
      return res.data.data;
    },
  });

  const renderEventCard = ({ item }: { item: any }) => {
    const eventCategory = (item.category || 'other') as EventCategory;
    const eventTheme = categoryThemes[eventCategory];
    const eventStyles = getStylesForCategory(eventCategory);

    return (
      <TouchableOpacity
        style={[styles.card, eventStyles.card]}
        onPress={() => navigation.navigate('EventDetail', { id: item._id, category: eventCategory })}
      >
        <FastImage
          style={styles.cardImage}
          source={{ uri: item.coverImage || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=80' }}
        />
        <View style={styles.cardContent}>
          <View style={[styles.categoryBadge, { backgroundColor: eventTheme.accent }]}>
            <Text style={[styles.categoryText, { color: eventTheme.accentText }]}>
              {eventCategory.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: eventTheme.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.cardDate, { color: eventTheme.textSecondary }]}>
            {format(new Date(item.date), 'MMM d, yyyy • h:mm a')}
          </Text>
          <Text style={[styles.cardVenue, { color: eventTheme.textSecondary }]} numberOfLines={1}>
            📍 {item.venue?.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, categoryStyles.container]}>
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, categoryStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, categoryStyles.title]}>My Events</Text>
      </View>

      {events?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No events yet. Create one to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800' },
  list: { padding: 24, paddingTop: 0 },
  card: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160 },
  cardContent: { padding: 16 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  categoryText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardDate: { fontSize: 14, marginBottom: 4 },
  cardVenue: { fontSize: 13 },
  loader: { marginTop: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});