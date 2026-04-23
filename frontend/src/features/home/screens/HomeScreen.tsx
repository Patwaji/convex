import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import Icon from '../../../shared/components/AppIcon';
import { apiClient } from '../../../shared/api/client';
import { AppTabsParamList, UserStackParamList } from '../../../navigation/types';
import { useEventsStore } from '../../events/store/eventsStore';
import { useAuthStore } from '../../auth/store/authStore';
import { Event, EventCategory } from '../../events/types';
import { EventCard } from '../../events/components/EventCard';
import CategoryPattern, { Category } from '../../../shared/components/CategoryPattern';
import { getCategoryColor, CATEGORY_COLORS, PURPLE_THEME_BASE } from '../../../shared/theme/categoryThemes';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const GRADIENT_HEIGHT = SCREEN_HEIGHT * 0.35;

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Home'>,
  StackNavigationProp<UserStackParamList>
>;

const CATEGORIES = ['all', 'tech', 'corporate', 'social', 'sports', 'arts', 'education', 'health', 'other'] as const;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const filterCategory = useEventsStore((state) => state.filterCategory);
  const setFilterCategory = useEventsStore((state) => state.setFilterCategory);
  const setActiveDetailCategory = useEventsStore((state) => state.setActiveDetailCategory);
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');

  const categoryAccent = CATEGORY_COLORS[(filterCategory === 'all' ? 'other' : filterCategory) as EventCategory] || PURPLE_THEME_BASE.accent;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['home_events', filterCategory, user?.hobbies, searchQuery],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (user?.hobbies?.length) params.hobbies = user.hobbies;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await apiClient.get('/events', { params });
      return response.data.data as Event[];
    },
  });

  const events = data ?? [];
  const categoryColor = getCategoryColor((filterCategory === 'all' ? 'other' : filterCategory) as EventCategory);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[categoryColor, '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <CategoryPattern 
          category={(filterCategory === 'all' ? 'other' : filterCategory) as Category} 
          width={SCREEN_WIDTH}
          height={GRADIENT_HEIGHT}
          opacity={0.25}
        />
      </LinearGradient>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.headerTopRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Find and join events fast.</Text>
          </View>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: categoryAccent }]}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Icon name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={PURPLE_THEME_BASE.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, or hosts"
            placeholderTextColor={PURPLE_THEME_BASE.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="x" size={16} color={PURPLE_THEME_BASE.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const active = filterCategory === item;
            const pillColor = CATEGORY_COLORS[item as EventCategory] || PURPLE_THEME_BASE.accent;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  active && { backgroundColor: pillColor, borderColor: pillColor },
                ]}
                onPress={() => setFilterCategory(item as EventCategory)}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {isLoading ? (
          <View style={styles.centerWrap}>
            <Text style={styles.metaText}>Loading events...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>Could not load events.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={isRefetching}
            ListEmptyComponent={<Text style={styles.metaText}>No events found in this category.</Text>}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() => {
                  setActiveDetailCategory((item.category || 'other') as EventCategory);
                  navigation.navigate('EventDetail', { id: item._id, category: item.category });
                }}
              />
            )}
          />
        )}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: GRADIENT_HEIGHT,
  },
  content: {
    flex: 1,
    paddingTop: 52,
  },
  headerSection: {
    flex: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: PURPLE_THEME_BASE.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#000000',
  },
  createButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: PURPLE_THEME_BASE.accent,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createButtonText: {
    color: PURPLE_THEME_BASE.accentText,
    fontSize: 13,
    fontWeight: '700',
  },
  searchBar: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PURPLE_THEME_BASE.border.color,
    backgroundColor: PURPLE_THEME_BASE.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 20,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PURPLE_THEME_BASE.textPrimary,
    fontWeight: '500',
  },
  categoryList: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  categoryPill: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PURPLE_THEME_BASE.border.color,
    backgroundColor: PURPLE_THEME_BASE.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: PURPLE_THEME_BASE.accent,
    borderColor: PURPLE_THEME_BASE.accent,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: PURPLE_THEME_BASE.textSecondary,
  },
  categoryTextActive: {
    color: PURPLE_THEME_BASE.accentText,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 200,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    marginBottom: 10,
  },
  retryButton: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#1F2937',
    fontWeight: '600',
  },
});