import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import GetLocation from 'react-native-get-location';
import Icon from '../../../shared/components/AppIcon';
import { useEventsStore } from '../../events/store/eventsStore';
import { getStylesForCategory, categoryThemes } from '../../../shared/theme/categoryThemes';
import { Event, EventCategory } from '../../events/types';
import { useExploreStore } from '../store/exploreStore';
import { EventCard } from '../../events/components/EventCard';
import { apiClient } from '../../../shared/api/client';
import { AppTabsParamList, UserStackParamList } from '../../../navigation/types';

type ExploreNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Find'>,
  StackNavigationProp<UserStackParamList>
>;

type PlaceSuggestion = {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
};

const CITY_WIDE_RADIUS_METERS = 50000;
const RADIUS_OPTIONS = [
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
] as const;

export default function ExploreScreen() {
  const filterCategory = useEventsStore(state => state.filterCategory);
  const setActiveDetailCategory = useEventsStore(state => state.setActiveDetailCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const theme = categoryThemes[activeCategory];
  const { userLocation, radius, setUserLocation, setRadius } = useExploreStore();
  const navigation = useNavigation<ExploreNavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationName, setLocationName] = useState('Current location');
  const [scope, setScope] = useState<'radius' | 'city'>('radius');
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locationSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveRadius = scope === 'city' ? CITY_WIDE_RADIUS_METERS : radius;

  const requestAndroidLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
    const [hasFine, hasCoarse] = await Promise.all([
      PermissionsAndroid.check(fine),
      PermissionsAndroid.check(coarse),
    ]);

    if (hasFine || hasCoarse) return true;

    const fineResult = await PermissionsAndroid.request(fine, {
      title: 'Location Permission',
      message: 'Convex needs your location to find nearby events.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (fineResult === PermissionsAndroid.RESULTS.GRANTED) return true;

    const coarseResult = await PermissionsAndroid.request(coarse, {
      title: 'Location Permission',
      message: 'Convex needs your location to find nearby events.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    return coarseResult === PermissionsAndroid.RESULTS.GRANTED;
  };

  const useCurrentLocation = async () => {
    setLocationError('');
    const granted = await requestAndroidLocationPermission();
    if (!granted) {
      setLocationError('Location permission denied. Search by city instead.');
      return;
    }

    try {
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
      });

      setUserLocation({ latitude: location.latitude, longitude: location.longitude });
      setLocationName('Current location');
      setLocationQuery('');
      setLocationSuggestions([]);
    } catch {
      setLocationError('Unable to fetch your location. Search by city instead.');
    }
  };

  const fetchCitySuggestions = async (query: string): Promise<PlaceSuggestion[]> => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'ConvexApp/1.0' },
    });
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => {
        const city =
          item?.address?.city ||
          item?.address?.town ||
          item?.address?.village ||
          item?.address?.county ||
          item?.address?.state ||
          '';

        return {
          address: item?.display_name || '',
          city,
          latitude: Number(item?.lat),
          longitude: Number(item?.lon),
        } as PlaceSuggestion;
      })
      .filter((item: PlaceSuggestion) => item.address && !Number.isNaN(item.latitude) && !Number.isNaN(item.longitude));
  };

  useEffect(() => {
    if (!userLocation) {
      void useCurrentLocation();
    }
  }, [userLocation]);

  useEffect(() => {
    if (locationSearchTimerRef.current) {
      clearTimeout(locationSearchTimerRef.current);
    }

    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    locationSearchTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await fetchCitySuggestions(query);
        setLocationSuggestions(suggestions);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);

    return () => {
      if (locationSearchTimerRef.current) {
        clearTimeout(locationSearchTimerRef.current);
      }
    };
  }, [locationQuery]);

  const nearbyQuery = useQuery({
    queryKey: ['nearby_events', userLocation?.latitude, userLocation?.longitude, effectiveRadius],
    enabled: !!userLocation,
    queryFn: async () => {
      const res = await apiClient.get('/events/nearby', {
        params: {
          lat: userLocation!.latitude,
          lng: userLocation!.longitude,
          radius: effectiveRadius,
        },
      });
      return (res.data?.data || []) as Event[];
    },
  });

  const filteredEvents = useMemo(() => {
    const allEvents = nearbyQuery.data || [];
    const q = searchQuery.trim().toLowerCase();

    return allEvents.filter((event) => {
      const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      const searchable = [
        event.title,
        event.description,
        event.venue?.address,
        event.venue?.city,
        event.organizer?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [nearbyQuery.data, searchQuery, filterCategory]);

  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    setUserLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    setLocationName(suggestion.city || suggestion.address.split(',')[0] || 'Selected place');
    setLocationQuery(suggestion.address);
    setLocationSuggestions([]);
    setLocationError('');
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={[styles.title, categoryStyles.title]}>Find Nearby Events</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Search from your exact location, a custom place, or an entire city.
        </Text>
      </View>

      <View style={[styles.section, categoryStyles.card]}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>Event Search</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border.color }]}
          placeholder="Search title, organizer, or venue"
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={[styles.section, categoryStyles.card]}>
        <View style={styles.locationHeader}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Search Location</Text>
          <TouchableOpacity style={[styles.currentButton, { borderColor: theme.accent }]} onPress={useCurrentLocation}>
            <Icon name="crosshair" size={14} color={theme.accent} />
            <Text style={[styles.currentButtonText, { color: theme.accent }]}>Use Current</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border.color }]}
          placeholder="Search city or area"
          placeholderTextColor={theme.textSecondary}
          value={locationQuery}
          onChangeText={setLocationQuery}
        />
        {!!locationName && (
          <Text style={[styles.currentLocationText, { color: theme.textSecondary }]}>Center: {locationName}</Text>
        )}
        {isSearchingLocation && <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} />}
        {locationSuggestions.length > 0 && (
          <View style={[styles.suggestionsBox, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
            {locationSuggestions.map((item) => (
              <TouchableOpacity
                key={`${item.latitude}-${item.longitude}-${item.address}`}
                style={styles.suggestionRow}
                onPress={() => selectSuggestion(item)}
              >
                <Text style={[styles.suggestionTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.city || item.address.split(',')[0]}
                </Text>
                <Text style={[styles.suggestionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!!locationError && <Text style={styles.errorText}>{locationError}</Text>}
      </View>

      <View style={[styles.section, categoryStyles.card]}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>Search Scope</Text>
        <View style={styles.scopeRow}>
          <TouchableOpacity
            style={[
              styles.scopePill,
              {
                backgroundColor: scope === 'radius' ? theme.accent : theme.surface,
                borderColor: scope === 'radius' ? theme.accent : theme.border.color,
              },
            ]}
            onPress={() => setScope('radius')}
          >
            <Text style={{ color: scope === 'radius' ? theme.accentText : theme.textSecondary, fontWeight: '700' }}>
              Radius
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scopePill,
              {
                backgroundColor: scope === 'city' ? theme.accent : theme.surface,
                borderColor: scope === 'city' ? theme.accent : theme.border.color,
              },
            ]}
            onPress={() => setScope('city')}
          >
            <Text style={{ color: scope === 'city' ? theme.accentText : theme.textSecondary, fontWeight: '700' }}>
              Entire City
            </Text>
          </TouchableOpacity>
        </View>

        {scope === 'radius' ? (
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map((option) => {
              const active = radius === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radiusPill,
                    {
                      backgroundColor: active ? theme.accent : theme.surface,
                      borderColor: active ? theme.accent : theme.border.color,
                    },
                  ]}
                  onPress={() => setRadius(option.value)}
                >
                  <Text style={{ color: active ? theme.accentText : theme.textSecondary, fontWeight: '700' }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.cityScopeHint, { color: theme.textSecondary }]}>
            City-wide mode searches a broad area around your selected city/location.
          </Text>
        )}
      </View>

      <Text style={[styles.resultsTitle, { color: theme.textPrimary }]}>Results ({filteredEvents.length})</Text>
    </View>
  );

  return (
    <View style={[styles.container, categoryStyles.container]}>
      {nearbyQuery.isLoading && !nearbyQuery.data ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loaderText, { color: theme.textSecondary }]}>Finding nearby events...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => {
                setActiveDetailCategory((item.category || 'other') as EventCategory);
                navigation.navigate('EventDetail', { id: item._id, category: item.category });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={[styles.resultsCard, categoryStyles.card]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No nearby events found. Try another location or switch to Entire City mode.</Text>
            </View>
          }
          refreshing={nearbyQuery.isRefetching}
          onRefresh={() => nearbyQuery.refetch()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 56, paddingBottom: 120 },
  header: { marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  section: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentButtonText: { fontSize: 12, fontWeight: '700' },
  currentLocationText: { marginTop: 8, fontSize: 12, fontWeight: '600' },
  suggestionsBox: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestionRow: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
  },
  suggestionTitle: { fontSize: 14, fontWeight: '700' },
  suggestionSubtitle: { fontSize: 12, marginTop: 2 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 8 },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  scopePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cityScopeHint: { fontSize: 13, lineHeight: 18 },
  resultsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  resultsCard: { padding: 22, alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 10, fontSize: 13 },
});
