import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useEventsStore } from '../../events/store/eventsStore';
import { getStylesForCategory, categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../../events/types';

export default function ExploreScreen() {
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const theme = categoryThemes[activeCategory];

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, Record<string, string>> = {
      tech: {
        search: 'Search Nodes',
        location: 'Sector',
        radius: 'Scan Range',
        filter: 'Filters',
        results: 'Discovered',
        nearby: 'Nearby Nodes',
      },
      corporate: {
        search: 'Search Companies',
        location: 'Business District',
        radius: 'Travel Radius',
        filter: 'Industry',
        results: 'Results',
        nearby: 'Nearby Businesses',
      },
      social: {
        search: 'Find Events',
        location: 'Neighborhood',
        radius: 'Distance',
        filter: 'Vibe',
        results: 'Happening Now',
        nearby: 'Around You',
      },
      sports: {
        search: 'Find Games',
        location: 'Arena',
        radius: 'Game Radius',
        filter: 'Sport',
        results: 'Match Results',
        nearby: 'Nearby Games',
      },
      arts: {
        search: 'Discover Art',
        location: 'Gallery',
        radius: 'Art Radius',
        filter: 'Medium',
        results: 'Exhibitions',
        nearby: 'Nearby Galleries',
      },
      education: {
        search: 'Find Courses',
        location: 'Campus',
        radius: 'Study Radius',
        filter: 'Subject',
        results: 'Available Courses',
        nearby: 'Nearby Classes',
      },
      health: {
        search: 'Find Sessions',
        location: 'Wellness Center',
        radius: 'Care Radius',
        filter: 'Activity',
        results: 'Available Sessions',
        nearby: 'Nearby Wellness',
      },
      other: {
        search: 'Search Events',
        location: 'Location',
        radius: 'Radius',
        filter: 'Filter',
        results: 'Results',
        nearby: 'Nearby',
      },
    };
    return labels[activeCategory]?.[field] || labels.other[field];
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = ['all', 'today', 'this-week', 'free', 'popular'];

  return (
    <ScrollView style={[styles.container, categoryStyles.container]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, categoryStyles.title]}>{getFieldLabel('nearby')}</Text>
      </View>

      <View style={[styles.searchBox, categoryStyles.card]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.surface, color: theme.textPrimary }]}
          placeholder={getFieldLabel('search')}
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.locationRow}>
        <View style={[styles.locationBox, categoryStyles.card]}>
          <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>{getFieldLabel('location')}</Text>
          <Text style={[styles.locationValue, { color: theme.textPrimary }]}>Current Location</Text>
        </View>
        <View style={[styles.radiusBox, categoryStyles.card]}>
          <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>{getFieldLabel('radius')}</Text>
          <Text style={[styles.locationValue, { color: theme.textPrimary }]}>10 km</Text>
        </View>
      </View>

      <Text style={[styles.filterLabel, { color: theme.textPrimary }]}>{getFieldLabel('filter')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                { backgroundColor: isSelected ? theme.accent : theme.surface, borderColor: theme.border.color },
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterText, { color: isSelected ? theme.accentText : theme.textSecondary }]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.resultsTitle, { color: theme.textPrimary }]}>{getFieldLabel('results')}</Text>

      <View style={[styles.resultsCard, categoryStyles.card]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {activeCategory === 'tech' ? '// Scanning for nodes...' :
           activeCategory === 'corporate' ? 'Searching business directory...' :
           activeCategory === 'social' ? 'Finding events near you...' :
           activeCategory === 'sports' ? 'Searching for games...' :
           activeCategory === 'arts' ? 'Finding galleries...' :
           activeCategory === 'education' ? 'Searching courses...' :
           activeCategory === 'health' ? 'Finding wellness sessions...' :
           'No results found'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800' },
  searchBox: { marginBottom: 16, borderWidth: 1 },
  searchInput: { height: 50, paddingHorizontal: 16, fontSize: 16, borderRadius: 8 },
  locationRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  locationBox: { flex: 1, padding: 16, borderWidth: 1 },
  radiusBox: { width: 80, padding: 16, borderWidth: 1 },
  locationLabel: { fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  locationValue: { fontSize: 16, fontWeight: '600' },
  filterLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  filters: { marginBottom: 24 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  filterText: { fontWeight: '600', fontSize: 13 },
  resultsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  resultsCard: { padding: 40, alignItems: 'center', borderWidth: 1 },
  emptyText: { fontSize: 16 },
});
