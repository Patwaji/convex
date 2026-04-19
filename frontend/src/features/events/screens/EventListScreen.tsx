import React from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

import { EventsStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../shared/api/client';
import { EventCard } from '../components/EventCard';
import { useEventsStore } from '../store/eventsStore';
import { Event, EventCategory } from '../types';
import { categoryThemes, getStylesForCategory } from '../../../shared/theme/categoryThemes';

type Props = StackScreenProps<EventsStackParamList, 'EventList'>;

const CATEGORIES = ['all', 'tech', 'corporate', 'social', 'sports', 'arts', 'education', 'health', 'other'] as const;

export default function EventListScreen({ navigation }: Props) {
  const filterCategory = useEventsStore(state => state.filterCategory);
  const setFilterCategory = useEventsStore(state => state.setFilterCategory);

  const theme = filterCategory === 'all' ? categoryThemes.other : categoryThemes[filterCategory as EventCategory];
  const categoryStyles = getStylesForCategory(filterCategory === 'all' ? 'other' : filterCategory as EventCategory);
  const isTech = filterCategory === 'tech';
  const isCorporate = filterCategory === 'corporate';
  const isSocial = filterCategory === 'social';
  const isSports = filterCategory === 'sports';
  const isArts = filterCategory === 'arts';
  const isEducation = filterCategory === 'education';
  const isHealth = filterCategory === 'health';
  const isOther = filterCategory === 'other' || filterCategory === 'all';

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['events', filterCategory],
    queryFn: async () => {
      const params = filterCategory === 'all' ? {} : { category: filterCategory };
      const response = await apiClient.get('/events', { params });
      return response.data.data;
    },
  });

  const renderSkeleton = () => (
    <View style={[styles.skeletonContainer, categoryStyles.container]}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={[styles.skeletonCard, categoryStyles.skeletonCard]}>
          <SkeletonPlaceholder borderRadius={theme.borderRadius}>
            <SkeletonPlaceholder.Item>
              <SkeletonPlaceholder.Item width="100%" height={180} borderBottomLeftRadius={0} borderBottomRightRadius={0} />
              <SkeletonPlaceholder.Item padding={16}>
                <SkeletonPlaceholder.Item width={120} height={20} borderRadius={4} marginBottom={12} />
                <SkeletonPlaceholder.Item width="80%" height={20} borderRadius={4} marginBottom={8} />
                <SkeletonPlaceholder.Item width="60%" height={20} borderRadius={4} marginBottom={16} />
                <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
                  <SkeletonPlaceholder.Item width={24} height={24} borderRadius={12} marginRight={8} />
                  <SkeletonPlaceholder.Item width={100} height={16} borderRadius={4} />
                </SkeletonPlaceholder.Item>
              </SkeletonPlaceholder.Item>
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder>
        </View>
      ))}
    </View>
  );

  const renderCategoryPill = ({ item }: { item: typeof CATEGORIES[number] }) => {
    const isSelected = filterCategory === item;
    const pillTheme = item === 'all' ? categoryThemes.other : categoryThemes[item as EventCategory];
    const isPillTech = item === 'tech';
    const isPillSocial = item === 'social';
    return (
      <TouchableOpacity
        style={[
          styles.pill, 
          { backgroundColor: pillTheme.surface },
          isSelected && categoryStyles.pillSelected,
          !isSelected && item !== 'all' && { borderWidth: theme.border.width, borderColor: theme.border.color },
          isPillTech && !isSelected && { borderWidth: 1, borderColor: '#00F0FF44', borderStyle: 'dashed' as const },
          isPillTech && isSelected && { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#00F0FF' },
          isPillSocial && isSelected && { backgroundColor: '#FF6B6B', borderRadius: 20 }
        ]}
        onPress={() => setFilterCategory(item as EventCategory)}
      >
        <Text style={[
          styles.pillText, 
          { color: isSelected ? pillTheme.accentText : pillTheme.textSecondary },
          isPillTech && isSelected && { color: '#00F0FF', fontFamily: 'monospace', letterSpacing: 1 },
          isPillSocial && isSelected && { color: '#FFFFFF', fontWeight: '700' }
        ]}>
          {isPillTech && isSelected ? item.toUpperCase() : 
           isPillSocial && isSelected ? '✨ ' + item.charAt(0).toUpperCase() + item.slice(1) :
           item.charAt(0).toUpperCase() + item.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCategoryBackground = () => {
    if (isTech) {
      return <View style={styles.techBgOverlay} pointerEvents="none" />;
    }
    return null;
  };

  return (
    <View style={[styles.container, categoryStyles.container]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {renderCategoryBackground()}
      </View>
      
      <View style={[styles.header, categoryStyles.header, isTech && styles.techHeader, { zIndex: 1 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, categoryStyles.title, isTech && styles.techTitle]}>
            {isTech ? 'DISCOVER' : isCorporate ? 'NETWORK' : isSocial ? 'Fun Events' : isSports ? 'GAME ON' : isArts ? 'Artistry' : isEducation ? 'Learn' : isHealth ? 'Wellness' : isOther ? 'Events' : 'Discover'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.createButton, categoryStyles.createButton, isTech && styles.techCreateButton]} 
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Text style={[styles.createButtonText, categoryStyles.createButtonText, isTech && styles.techCreateText]}>
            {isTech ? '+ NEW' : isCorporate ? 'CONNECT' : isSocial ? 'Host' : isSports ? 'HOST' : isArts ? 'Create' : isEducation ? 'Study' : isHealth ? 'Join' : isOther ? 'Create' : '+ Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filters, { marginTop: isTech ? 8 : 0 }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item}
          renderItem={renderCategoryPill}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>Failed to load events.</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: theme.surface }]}>
            <Text style={[styles.retryText, { color: theme.textPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data?.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {filterCategory === 'tech' ? '// No events found in system' : 
             filterCategory === 'social' ? '🎉 No parties yet! Be the first to host one' :
             filterCategory === 'sports' ? 'NO ACTIVE EVENTS' :
             filterCategory === 'arts' ? 'No artworks on display' :
             'No events found in this category'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={data as Event[]}
          renderItem={({ item }: { item: Event }) => (
            <EventCard 
              event={item} 
              onPress={() => navigation.navigate('EventDetail', { id: item._id, category: item.category })} 
            />
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    position: 'relative',
  },
  techHeader: {
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  techTitle: {
    fontFamily: 'monospace',
    letterSpacing: 1,
    color: '#00F0FF',
  },
  socialHeader: {
    paddingBottom: 20,
  },
  socialTitle: {
    color: '#FF6B6B',
  },
  socialEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  techCreateButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  techCreateText: {
    color: '#00F0FF',
    fontFamily: 'monospace',
  },
  socialCreateButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 0,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
socialCreateText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  filters: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  pillSelected: {
    backgroundColor: '#6366F1',
  },
  pillText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  retryText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  skeletonCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  techGridOverlay: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  techBgOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0A0F',
  },
  socialBgOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFF1EE',
    overflow: 'hidden',
  },
  socialBubble: {
    position: 'absolute',
    top: -50,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#00F0FF',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#00F0FF',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00F0FF',
  },
});
