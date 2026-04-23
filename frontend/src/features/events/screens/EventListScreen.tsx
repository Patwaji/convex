import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../../../shared/components/AppIcon';

import { EventsStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../shared/api/client';
import { EventCard } from '../components/EventCard';
import { useEventsStore } from '../store/eventsStore';
import { useAuthStore } from '../../auth/store/authStore';
import { Event, EventCategory } from '../types';
import { categoryThemes } from '../../../shared/theme/categoryThemes';

type Props = StackScreenProps<EventsStackParamList, 'EventList'>;

type EventListItem =
  | { type: 'sticky'; key: 'sticky-category-bar' }
  | { type: 'event'; key: string; event: Event };

const CATEGORIES = ['all', 'tech', 'corporate', 'social', 'sports', 'arts', 'education', 'health', 'other'] as const;
type HeaderKey = (typeof CATEGORIES)[number];

const UNIFIED_HEADER_ACCENT = '#334155';
const UNIFIED_HEADER_GRADIENT: [string, string] = ['#FFFFFF', '#F8FAFC'];

const HEADER_VARIANTS: Record<
  HeaderKey,
  {
    status: string;
    heroLead: string;
    heroAccent: string;
    heroTail: string;
    searchHint: string;
    accent: string;
    gradient: [string, string];
  }
> = {
  all: {
    status: 'Live events nearby',
    heroLead: 'What are you planning',
    heroAccent: 'today',
    heroTail: '?',
    searchHint: 'Search events, venues, or hosts',
    accent: '#6D5EF8',
    gradient: ['#ECE9FF', '#E6F0FF'],
  },
  tech: {
    status: 'Hack nights and talks',
    heroLead: 'What are you building',
    heroAccent: 'next',
    heroTail: '?',
    searchHint: 'Search meetups, hackathons, speakers',
    accent: '#00C2FF',
    gradient: ['#E6FAFF', '#EEF4FF'],
  },
  corporate: {
    status: 'Professional networking active',
    heroLead: 'Which network are you growing',
    heroAccent: 'today',
    heroTail: '?',
    searchHint: 'Search summits, panels, networking',
    accent: '#246BFD',
    gradient: ['#E9F0FF', '#EEF6FF'],
  },
  social: {
    status: 'Hangouts happening now',
    heroLead: 'Who are you meeting',
    heroAccent: 'tonight',
    heroTail: '?',
    searchHint: 'Search parties, mixers, hangouts',
    accent: '#FF6B6B',
    gradient: ['#FFEDEE', '#FFF6ED'],
  },
  sports: {
    status: 'Matches around you',
    heroLead: 'Ready for game',
    heroAccent: 'time',
    heroTail: '?',
    searchHint: 'Search tournaments, courts, clubs',
    accent: '#F59E0B',
    gradient: ['#FFF3DF', '#FFF9ED'],
  },
  arts: {
    status: 'Creative spaces open',
    heroLead: 'What are you creating',
    heroAccent: 'today',
    heroTail: '?',
    searchHint: 'Search exhibitions, galleries, live art',
    accent: '#B453E4',
    gradient: ['#F8EEFF', '#FFF4FA'],
  },
  education: {
    status: 'Learning sessions live',
    heroLead: 'What do you want to',
    heroAccent: 'learn',
    heroTail: '?',
    searchHint: 'Search workshops, seminars, classes',
    accent: '#0EA5A4',
    gradient: ['#E6FBF8', '#F0FFFB'],
  },
  health: {
    status: 'Wellness events nearby',
    heroLead: 'How are you recharging',
    heroAccent: 'today',
    heroTail: '?',
    searchHint: 'Search yoga, mindfulness, wellness',
    accent: '#10B981',
    gradient: ['#E9FFF4', '#F4FFF8'],
  },
  other: {
    status: 'Unique plans unlocked',
    heroLead: 'What are you exploring',
    heroAccent: 'today',
    heroTail: '?',
    searchHint: 'Search unique events and experiences',
    accent: '#64748B',
    gradient: ['#F1F5F9', '#F8FAFC'],
  },
};

export default function EventListScreen({ navigation }: Props) {
  const filterCategory = useEventsStore(state => state.filterCategory);
  const setFilterCategory = useEventsStore(state => state.setFilterCategory);
  const setActiveDetailCategory = useEventsStore(state => state.setActiveDetailCategory);
  const user = useAuthStore(state => state.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'popularity'>('date');
  const [showSortModal, setShowSortModal] = useState(false);

  const neutralTheme = categoryThemes.other;
  const headerKey = (CATEGORIES.includes(filterCategory as HeaderKey) ? filterCategory : 'all') as HeaderKey;
  const headerVariant = {
    ...HEADER_VARIANTS[headerKey],
    accent: UNIFIED_HEADER_ACCENT,
    gradient: UNIFIED_HEADER_GRADIENT,
  };

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['events', filterCategory, user?.hobbies, searchQuery, dateFilter, sortBy],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }
      if (user?.hobbies && user.hobbies.length > 0) {
        params.hobbies = user.hobbies;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (dateFilter) {
        params.dateFilter = dateFilter;
      }
      if (sortBy) {
        params.sort = sortBy;
      }
      const response = await apiClient.get('/events', { params });
      return response.data.data;
    },
  });

  const dateFilters = [
    { key: '', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  const sortOptions = [
    { key: 'date', label: 'Nearest Date', icon: 'calendar' },
    { key: 'popularity', label: 'Most Popular', icon: 'users' },
  ];

  const events = (data as Event[] | undefined) ?? [];
  const listData: EventListItem[] = [
    { type: 'sticky', key: 'sticky-category-bar' } as EventListItem,
    ...events.map((event) => ({ type: 'event' as const, key: event._id, event })),
  ];

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonCard}>
          <View style={[styles.skeletonImage, { backgroundColor: '#E2E8F0' }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { width: '40%', backgroundColor: '#E2E8F0' }]} />
            <View style={[styles.skeletonLine, { width: '70%', backgroundColor: '#E2E8F0' }]} />
            <View style={[styles.skeletonLine, { width: '50%', backgroundColor: '#E2E8F0' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderCategoryPill = ({ item }: { item: typeof CATEGORIES[number] }) => {
    const isSelected = filterCategory === item;
    return (
      <TouchableOpacity
        style={[
          styles.pill,
          {
            backgroundColor: isSelected ? headerVariant.accent : neutralTheme.surface,
            borderColor: isSelected ? headerVariant.accent : neutralTheme.border.color,
          },
        ]}
        onPress={() => setFilterCategory(item as EventCategory)}
      >
        <Text style={[
          styles.pillText,
          { color: isSelected ? '#FFFFFF' : neutralTheme.textSecondary },
        ]}>
          {item.charAt(0).toUpperCase() + item.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTopSection = () => (
    <LinearGradient colors={headerVariant.gradient} style={styles.headerGradient}>
      <View style={styles.headerGlowLeft} />
      <View style={styles.headerGlowRight} />
      <View style={styles.headerTopRow}>
        <Text style={styles.eventsHeading}>Events</Text>

        <TouchableOpacity
          style={[styles.createTopButton, { backgroundColor: headerVariant.accent }]}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Text style={styles.createTopButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {headerVariant.heroLead}{' '}
            <Text style={[styles.titleAccent, { color: headerVariant.accent }]}>{headerVariant.heroAccent}</Text>
            {headerVariant.heroTail}
          </Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#475569" />
        <TextInput
          style={styles.searchInput}
          placeholder={headerVariant.searchHint}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={dateFilters}
          keyExtractor={item => item.key}
          renderItem={({ item: dateItem }) => (
            <TouchableOpacity
              style={[
                styles.dateFilterPill,
                {
                  backgroundColor: dateFilter === dateItem.key ? headerVariant.accent + '20' : neutralTheme.surface,
                  borderColor: dateFilter === dateItem.key ? headerVariant.accent : neutralTheme.border.color,
                },
              ]}
              onPress={() => setDateFilter(dateItem.key)}
            >
              <Text
                style={[
                  styles.dateFilterText,
                  { color: dateFilter === dateItem.key ? headerVariant.accent : neutralTheme.textSecondary },
                ]}
              >
                {dateItem.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.dateFiltersContent}
        />
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: neutralTheme.surface, borderColor: neutralTheme.border.color }]}
          onPress={() => setShowSortModal(true)}
        >
          <Icon name={sortBy === 'popularity' ? 'users' : 'calendar'} size={16} color={headerVariant.accent} />
          <Text style={[styles.sortButtonText, { color: headerVariant.accent }]}> 
            {sortBy === 'popularity' ? 'Popular' : 'Date'}
          </Text>
          <Icon name="chevron-right" size={14} color={headerVariant.accent} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderStickyCategoryBar = () => (
    <View style={[styles.stickyCategoryBar, { borderBottomColor: neutralTheme.border.color, backgroundColor: '#F3F4F6' }]}>
      <View style={styles.categoryHeaderRow}>
        <Text style={styles.categoryHeading}>Category</Text>
        <Text style={[styles.categorySeeAll, { color: `${headerVariant.accent}CC` }]}>See all</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={item => item}
        renderItem={renderCategoryPill}
        contentContainerStyle={styles.filtersContent}
      />
    </View>
  );

  return (
    <View style={styles.container}>

      {isLoading ? (
        renderSkeleton()
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>Failed to load events.</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: neutralTheme.surface }]}> 
            <Text style={[styles.retryText, { color: neutralTheme.textPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'sticky') {
              return renderStickyCategoryBar();
            }

            return (
              <EventCard
                event={item.event}
                onPress={() => {
                  setActiveDetailCategory(item.event.category as EventCategory);
                  navigation.navigate('EventDetail', { id: item.event._id, category: item.event.category });
                }}
              />
            );
          }}
          ListHeaderComponent={renderTopSection}
          ListFooterComponent={
            events.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <Text style={[styles.emptyText, { color: neutralTheme.textSecondary }]}>No events found in this category</Text>
              </View>
            ) : null
          }
          stickyHeaderIndices={[1]}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showSortModal} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSortModal(false)}>
          <View style={[styles.sortModal, { backgroundColor: neutralTheme.surface }]}>
            <Text style={[styles.sortModalTitle, { color: neutralTheme.textPrimary }]}>Sort By</Text>
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  { borderColor: sortBy === option.key ? headerVariant.accent : neutralTheme.border.color }
                ]}
                onPress={() => {
                  setSortBy(option.key as 'date' | 'popularity');
                  setShowSortModal(false);
                }}
              >
                <Icon name={option.icon} size={18} color={sortBy === option.key ? headerVariant.accent : neutralTheme.textSecondary} />
                <Text style={[
                  styles.sortOptionText,
                  { color: sortBy === option.key ? headerVariant.accent : neutralTheme.textPrimary }
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Icon name="check" size={18} color={headerVariant.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerGradient: {
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 10,
  },
  headerGlowLeft: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.35)',
    top: -120,
    left: -80,
  },
  headerGlowRight: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.22)',
    top: -100,
    right: -60,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 8,
  },
  eventsHeading: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -1,
  },
  createTopButton: {
    minWidth: 120,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  createTopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
  },
  titleRow: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  titleAccent: {
    fontWeight: '900',
  },
  searchBar: {
    marginHorizontal: 24,
    marginTop: 2,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFFD9',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchText: {
    fontSize: 18,
    color: '#475569',
    fontWeight: '500',
  },
  categoryHeaderRow: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeading: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '800',
  },
  categorySeeAll: {
    fontSize: 16,
    fontWeight: '700',
  },
  filtersContent: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 12,
  },
  stickyCategoryBar: {
    borderBottomWidth: 0,
    paddingTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    zIndex: 3,
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyStateWrap: {
    paddingTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  skeletonImage: {
    width: '100%',
    height: 180,
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonLine: {
    height: 20,
    marginBottom: 8,
    borderRadius: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 12,
  },
  dateFiltersContent: {
    paddingRight: 12,
  },
  dateFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
