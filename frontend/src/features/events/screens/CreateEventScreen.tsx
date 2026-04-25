import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Dimensions, ActivityIndicator, Modal, PermissionsAndroid, Alert, Linking } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'react-native-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import Icon from '../../../shared/components/AppIcon';
import FastImage from 'react-native-fast-image';
import GetLocation from 'react-native-get-location';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { EventsStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../shared/api/client';
import { useEventsStore } from '../store/eventsStore';
import { getStylesForCategory, getCategoryColor, categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';
import ThemedAlert from '../../../shared/components/ThemedAlert';
import CategoryPattern, { Category } from '../../../shared/components/CategoryPattern';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AddressSuggestion = {
  displayName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
};

const SEARCH_HEADERS: Record<string, string> = {
  'Accept-Language': 'en',
  'User-Agent': 'ConvexApp/1.0',
};

type LocationAccess = {
  granted: boolean;
  highAccuracy: boolean;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type CreateEventScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'CreateEvent'>;

interface Props {
  navigation: CreateEventScreenNavigationProp;
}

type SelectedImage = {
  uri: string;
  type: string;
  fileName: string;
};

export default function CreateEventScreen({ navigation }: Props) {
  const storeFilterCategory = useEventsStore.getState().filterCategory;
  const initialCategory = storeFilterCategory === 'all' ? 'other' : storeFilterCategory;
  
  const [category, setCategory] = useState<string>(initialCategory);
  
  const activeCategory = category as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const theme = categoryThemes[activeCategory];
  
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, Record<string, string>> = {
      tech: { title: 'Project Name', description: 'Technical Brief', venueAddress: 'Lab Address', city: 'Tech Hub', image: 'Upload Blueprint', submit: 'Initialize', date: 'Date & Time' },
      corporate: { title: 'Event Title', description: 'Business Brief', venueAddress: 'Office Address', city: 'Business District', image: 'Company Logo', submit: 'Submit Proposal', date: 'Date & Time' },
      social: { title: 'Event Name', description: 'What\'s the vibe?', venueAddress: 'Location', city: 'Where at?', image: 'Add Photo', submit: 'Let\'s Go!', date: 'When?' },
      sports: { title: 'Match Title', description: 'Event Details', venueAddress: 'Venue Address', city: 'City', image: 'Team Logo', submit: 'Game On', date: 'Match Time' },
      arts: { title: 'Artwork Title', description: 'About the Piece', venueAddress: 'Location', city: 'City', image: 'Upload Artwork', submit: 'Exhibit', date: 'Exhibition Date' },
      education: { title: 'Course Title', description: 'Course Details', venueAddress: 'Address', city: 'Campus', image: 'Course Image', submit: 'Start Course', date: 'Start Date' },
      health: { title: 'Session Name', description: 'Session Details', venueAddress: 'Studio Address', city: 'Location', image: 'Add Image', submit: 'Join Session', date: 'Session Time' },
      other: { title: 'Event Title', description: 'Description', venueAddress: 'Address', city: 'City', image: 'Add Cover Image', submit: 'Submit', date: 'Date & Time' },
    };
    return labels[category]?.[field] || labels.other[field];
  };
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDateTime, setEventDateTime] = useState<Date>(new Date(Date.now() + 86400000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [addressNoResults, setAddressNoResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPin, setMapPin] = useState<Coordinate | null>(null);
  const [isResolvingMapAddress, setIsResolvingMapAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<Coordinate>({
    latitude: 20.5937,
    longitude: 78.9629,
  });
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<AddressSuggestion[]>([]);
  const [showMapSearchDropdown, setShowMapSearchDropdown] = useState(false);
  const [mapSearchNoResults, setMapSearchNoResults] = useState(false);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const [mapPickedSuggestion, setMapPickedSuggestion] = useState<AddressSuggestion | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [alertState, setAlertState] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; confirmText?: string; onConfirm?: () => void }>({ visible: false, type: 'info', title: '', message: '' });
  const addressSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  const extractCity = (address: any): string => {
    return (
      address?.city ||
      address?.town ||
      address?.village ||
      address?.county ||
      address?.state_district ||
      ''
    );
  };

  const mergeAndUniqueSuggestions = (items: AddressSuggestion[]) => {
    const seen = new Set<string>();
    const unique: AddressSuggestion[] = [];

    for (const item of items) {
      const key = `${item.address.toLowerCase()}|${item.lat.toFixed(5)}|${item.lng.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    return unique;
  };

  const LOCATIONIQ_KEY = 'pk.993766f4473223d1068bd9852371e8b9';

  const fetchPlaceSuggestions = async (query: string, limit: number): Promise<AddressSuggestion[]> => {
    const locationIqUrl = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&format=json&limit=${limit}`;
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`;

    let locationIqResults: AddressSuggestion[] = [];
    try {
      const locationIqResp = await fetch(locationIqUrl);
      const locationIqData = await locationIqResp.json();
      locationIqResults = Array.isArray(locationIqData)
        ? locationIqData.map((item: any) => ({
            displayName: item.display_name,
            address: item.display_name,
            city: item.address?.city || item.address?.county || item.address?.state || '',
            lat: Number(item.lat),
            lng: Number(item.lon),
          }))
        : [];
    } catch {
      locationIqResults = [];
    }

    let photonResults: AddressSuggestion[] = [];
    try {
      const photonResp = await fetch(photonUrl, { headers: SEARCH_HEADERS });
      const photonData = await photonResp.json();
      photonResults = Array.isArray(photonData?.features)
        ? photonData.features
            .map((f: any) => {
              const props = f?.properties || {};
              const coords = f?.geometry?.coordinates || [];
              const lng = Number(coords[0]);
              const lat = Number(coords[1]);
              const city = props.city || props.county || props.state || '';
              const name = props.name || '';
              const street = props.street || '';
              const houseNumber = props.housenumber || '';
              const state = props.state || '';
              const country = props.country || '';
              const address = [name, [houseNumber, street].filter(Boolean).join(' '), city, state, country]
                .filter(Boolean)
                .join(', ');

              return {
                displayName: address,
                address,
                city,
                lat,
                lng,
              } as AddressSuggestion;
            })
            .filter((item: AddressSuggestion) => item.address && !Number.isNaN(item.lat) && !Number.isNaN(item.lng))
        : [];
    } catch {
      photonResults = [];
    }

    let nominatimResults: AddressSuggestion[] = [];
    try {
      const nominatimResp = await fetch(nominatimUrl, { headers: SEARCH_HEADERS });
      const nominatimData = await nominatimResp.json();
      nominatimResults = Array.isArray(nominatimData)
        ? nominatimData
            .map((item: any) => {
              const cityName = extractCity(item.address);
              return {
                displayName: item.display_name || '',
                address: item.display_name || '',
                city: cityName,
                lat: Number(item.lat),
                lng: Number(item.lon),
              };
            })
            .filter((item: AddressSuggestion) => item.address && !Number.isNaN(item.lat) && !Number.isNaN(item.lng))
        : [];
    } catch {
      nominatimResults = [];
    }

    return mergeAndUniqueSuggestions([...locationIqResults, ...photonResults, ...nominatimResults]).slice(0, limit);
  };

  useEffect(() => {
    if (addressSearchTimerRef.current) {
      clearTimeout(addressSearchTimerRef.current);
    }

    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      setAddressNoResults(false);
      setIsSearchingAddress(false);
      return;
    }

    setIsSearchingAddress(true);
    addressSearchTimerRef.current = setTimeout(async () => {
      try {
        const mapped = await fetchPlaceSuggestions(query, 8);
        setAddressSuggestions(mapped);
        setShowAddressDropdown(true);
        setAddressNoResults(mapped.length === 0);
      } catch {
        setAddressSuggestions([]);
        setShowAddressDropdown(true);
        setAddressNoResults(true);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 350);

    return () => {
      if (addressSearchTimerRef.current) {
        clearTimeout(addressSearchTimerRef.current);
      }
    };
  }, [addressQuery]);

  const onAddressInputChange = (text: string) => {
    setAddressQuery(text);
    setSelectedAddress(null);
    setAddressNoResults(false);
  };

  const selectAddress = (item: AddressSuggestion) => {
    setSelectedAddress(item);
    setAddressQuery(item.address);
    setAddressSuggestions([]);
    setShowAddressDropdown(false);
    const pin = { latitude: item.lat, longitude: item.lng };
    setMapPin(pin);
    setMapCenter({
      latitude: item.lat,
      longitude: item.lng,
    });
  };

  const reverseGeocodeCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<AddressSuggestion | null> => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, { headers: SEARCH_HEADERS });
    const data = await response.json();

    if (!data?.display_name) {
      return null;
    }

    return {
      displayName: data.display_name,
      address: data.display_name,
      city: extractCity(data.address),
      lat: latitude,
      lng: longitude,
    };
  };

  const getOpenStreetMapHtml = (center: Coordinate, pin: Coordinate | null) => {
    const pinScript = pin
      ? `L.marker([${pin.latitude}, ${pin.longitude}]).addTo(map);`
      : '';

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      ${pinScript}
      let marker = null;
      map.on('click', function (e) {
        if (marker) { map.removeLayer(marker); }
        marker = L.marker(e.latlng).addTo(map);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', latitude: e.latlng.lat, longitude: e.latlng.lng }));
      });
    </script>
  </body>
</html>`;
  };

  const onMapMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.type !== 'pick') return;

      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

      setMapPin({ latitude, longitude });
      setMapCenter({ latitude, longitude });
      setMapPickedSuggestion(null);
    } catch {
      // Ignore malformed bridge messages from web map.
    }
  };

  const requestLocationPermissionIfNeeded = async (): Promise<LocationAccess> => {
    if (Platform.OS !== 'android') {
      return { granted: true, highAccuracy: true };
    }

    const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const coarsePermission = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

    const [hasFineAlready, hasCoarseAlready] = await Promise.all([
      PermissionsAndroid.check(finePermission),
      PermissionsAndroid.check(coarsePermission),
    ]);

    if (hasFineAlready || hasCoarseAlready) {
      return {
        granted: true,
        highAccuracy: hasFineAlready,
      };
    }

    const permissionPrompt = {
      title: 'Location Permission',
      message: 'Allow location access to auto-fill your event address.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    };

    const fineResult = await PermissionsAndroid.request(finePermission, permissionPrompt);
    const coarseResult = await PermissionsAndroid.request(coarsePermission, permissionPrompt);

    const fineGranted = fineResult === PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted = coarseResult === PermissionsAndroid.RESULTS.GRANTED;

    return {
      granted: fineGranted || coarseGranted,
      highAccuracy: fineGranted,
    };
  };

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
        await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        return;
      }
    } catch {
      // Fall back to app settings below.
    }

    try {
      await Linking.openSettings();
    } catch {
      setAlertState({
        visible: true,
        type: 'error',
        title: '◆ SETTINGS UNAVAILABLE',
        message: 'Could not open settings automatically. Please enable location services manually.',
      });
    }
  };

  const getCurrentCoordinates = async (preferHighAccuracy: boolean) => {
    const attempts = preferHighAccuracy
      ? [
          { enableHighAccuracy: true, timeout: 15000 },
          { enableHighAccuracy: false, timeout: 20000 },
        ]
      : [{ enableHighAccuracy: false, timeout: 20000 }];

    let lastError: any;
    for (const config of attempts) {
      try {
        return await GetLocation.getCurrentPosition(config);
      } catch (error: any) {
        lastError = error;
      }
    }

    throw lastError;
  };

  const handleUseCurrentLocation = async () => {
    if (isLocatingCurrent) return;

    const permission = await requestLocationPermissionIfNeeded();
    if (!permission.granted) {
      Alert.alert(
        'Location permission needed',
        'Enable location permission to use current location for address auto-fill.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              void openLocationSettings();
            },
          },
        ]
      );
      return;
    }

    setIsLocatingCurrent(true);
    try {
      const location = await getCurrentCoordinates(permission.highAccuracy);
      const mapped = await reverseGeocodeCoordinates(location.latitude, location.longitude);

      const resolvedAddress: AddressSuggestion = mapped ?? {
        displayName: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        address: `Lat ${location.latitude.toFixed(6)}, Lng ${location.longitude.toFixed(6)}`,
        city: 'Unknown',
        lat: location.latitude,
        lng: location.longitude,
      };

      setSelectedAddress(resolvedAddress);
      setAddressQuery(resolvedAddress.address);
      setShowAddressDropdown(false);
      setAddressSuggestions([]);
      setAddressNoResults(false);

      const pin = { latitude: resolvedAddress.lat, longitude: resolvedAddress.lng };
      setMapPin(pin);
      setMapCenter(pin);
      setMapPickedSuggestion(resolvedAddress);

      if (!mapped) {
        setAlertState({
          visible: true,
          type: 'info',
          title: '◆ COORDINATES SET',
          message: 'Current coordinates were captured, but readable address could not be resolved.',
        });
      }
    } catch (error: any) {
      const fallbackMessage = 'Unable to fetch your current location. Ensure GPS is enabled and try again.';
      const code = String(error?.code || '').toUpperCase();
      let errMsg = fallbackMessage;

      if (code === 'TIMEOUT') {
        errMsg = 'Location request timed out. Move to an open area and try again.';
      } else if (code === 'UNAVAILABLE') {
        errMsg = 'Location is unavailable on this device right now. Enable GPS and location services.';
      } else if (code === 'UNAUTHORIZED') {
        errMsg = 'Location permission was not granted for this app.';
      } else if (typeof error?.message === 'string' && error.message.trim()) {
        errMsg = error.message;
      }

      if (code === 'UNAVAILABLE' || code === 'UNAUTHORIZED') {
        Alert.alert(
          'Enable Location Services',
          errMsg,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                void openLocationSettings();
              },
            },
          ]
        );
      }

      setAlertState({
        visible: true,
        type: 'error',
        title: '◆ LOCATION FAILED',
        message: errMsg,
      });
    } finally {
      setIsLocatingCurrent(false);
    }
  };

  useEffect(() => {
    if (!showMapPicker) return;

    if (mapSearchTimerRef.current) {
      clearTimeout(mapSearchTimerRef.current);
    }

    const query = mapSearchQuery.trim();
    if (query.length < 2) {
      setMapSearchResults([]);
      setShowMapSearchDropdown(false);
      setMapSearchNoResults(false);
      setIsSearchingMap(false);
      return;
    }

    setIsSearchingMap(true);
    mapSearchTimerRef.current = setTimeout(async () => {
      try {
        const mapped = await fetchPlaceSuggestions(query, 10);

        setMapSearchResults(mapped);
        setShowMapSearchDropdown(true);
        setMapSearchNoResults(mapped.length === 0);
      } catch {
        setMapSearchResults([]);
        setShowMapSearchDropdown(true);
        setMapSearchNoResults(true);
      } finally {
        setIsSearchingMap(false);
      }
    }, 300);

    return () => {
      if (mapSearchTimerRef.current) {
        clearTimeout(mapSearchTimerRef.current);
      }
    };
  }, [mapSearchQuery, showMapPicker]);

  const selectMapSearchResult = (item: AddressSuggestion) => {
    setMapSearchQuery(item.address);
    setShowMapSearchDropdown(false);
    setMapSearchNoResults(false);
    setMapSearchResults([]);
    setMapCenter({ latitude: item.lat, longitude: item.lng });
    setMapPin({ latitude: item.lat, longitude: item.lng });
    setMapPickedSuggestion(item);
  };

  const confirmMapLocation = async () => {
    if (!mapPin) {
      setAlertState({
        visible: true,
        type: 'warning',
        title: '◆ PIN REQUIRED',
        message: 'Tap on the map to drop a pin first.',
      });
      return;
    }

    // If user selected from map search dropdown, trust that structured result
    // and skip another network reverse-lookup to avoid intermittent failures.
    if (mapPickedSuggestion) {
      const mapped: AddressSuggestion = {
        ...mapPickedSuggestion,
        lat: mapPin.latitude,
        lng: mapPin.longitude,
      };
      setSelectedAddress(mapped);
      setAddressQuery(mapped.address);
      setShowAddressDropdown(false);
      setAddressSuggestions([]);
      setShowMapPicker(false);
      return;
    }

    try {
      setIsResolvingMapAddress(true);
      const mapped = await reverseGeocodeCoordinates(mapPin.latitude, mapPin.longitude);

      if (!mapped) {
        if (selectedAddress) {
          // Fallback to last known good address instead of hard failing.
          const fallbackMapped: AddressSuggestion = {
            ...selectedAddress,
            lat: mapPin.latitude,
            lng: mapPin.longitude,
          };
          setSelectedAddress(fallbackMapped);
          setAddressQuery(fallbackMapped.address);
          setShowMapPicker(false);
          return;
        }
        throw new Error('No address found for selected pin');
      }

      setSelectedAddress(mapped);
      setAddressQuery(mapped.address);
      setShowAddressDropdown(false);
      setAddressSuggestions([]);
      setShowMapPicker(false);
      setMapPickedSuggestion(mapped);
    } catch {
      setAlertState({
        visible: true,
        type: 'error',
        title: '◆ MAP LOOKUP FAILED',
        message: 'Could not resolve address from map pin. Try another spot.',
      });
    } finally {
      setIsResolvingMapAddress(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating event with data:', JSON.stringify(data, null, 2));
      const { imageFile, ...eventPayload } = data;
      let coverImageUrl: string | undefined;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', {
          uri: imageFile.uri,
          type: imageFile.type,
          name: imageFile.fileName,
        } as any);

        const uploadResponse = await apiClient.post('/events/upload-cover', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        coverImageUrl = uploadResponse.data?.data?.url;
      }

      return apiClient.post('/events', {
        ...eventPayload,
        coverImage: coverImageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setAlertState({
        visible: true,
        type: 'success',
        title: '◆ SUCCESS',
        message: 'Event created successfully and is pending admin review.',
        confirmText: 'OK',
        onConfirm: () => {
          setAlertState({ ...alertState, visible: false });
          navigation.goBack();
        },
      });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data;
      const errorMsg = errorData?.error?.message || '';
      
      let displayMsg = 'Failed to create event';
      if (errorMsg.includes('token') || errorMsg.includes('Token')) {
        displayMsg = 'Please login again to create an event';
      } else if (errorMsg) {
        displayMsg = errorMsg;
      }
      
      setAlertState({
        visible: true,
        type: 'error',
        title: '◆ ERROR',
        message: displayMsg,
      });
    }
  });

  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 }, (response) => {
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (!asset?.uri) return;

        setImageUri(asset.uri);
        setSelectedImage({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `event-cover-${Date.now()}.jpg`,
        });
      }
    });
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (!selectedDate) return;

    const next = new Date(eventDateTime);
    next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    setEventDateTime(next);
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (!selectedTime) return;

    const next = new Date(eventDateTime);
    next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setEventDateTime(next);
  };

  const handleCreate = () => {
    if (!title || !description) {
      setAlertState({ visible: true, type: 'warning', title: '◆ INCOMPLETE', message: 'Please fill in all required fields' });
      return;
    }

    if (!selectedAddress) {
      setAlertState({
        visible: true,
        type: 'warning',
        title: '◆ ADDRESS REQUIRED',
        message: 'Please select an address from the suggestions list.',
      });
      return;
    }

    createMutation.mutate({
      title,
      description,
      category,
      date: eventDateTime.toISOString(),
      venue: {
        address: selectedAddress.address,
        city: selectedAddress.city || 'Unknown',
        location: { type: 'Point', coordinates: [selectedAddress.lng, selectedAddress.lat] },
      },
      imageFile: selectedImage,
    });
  };

  const categoryColor = getCategoryColor(activeCategory);

  return (
    <View style={[styles.container, categoryStyles.container]}>
      <LinearGradient
        colors={[categoryColor, '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      >
        <CategoryPattern category={category as Category} width={SCREEN_WIDTH} height={400} opacity={0.2} />
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, categoryStyles.title]}>{getFieldLabel('submit').split(' ')[0]}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: theme.accent }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.imagePicker, categoryStyles.card]} onPress={pickImage}>
        {imageUri ? (
          <FastImage source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="camera" size={32} color={theme.textSecondary} />
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>{getFieldLabel('image')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.form}>
        <View>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('title')} *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder={`Enter ${getFieldLabel('title').toLowerCase()}`} placeholderTextColor={theme.textSecondary} value={title} onChangeText={setTitle} />
        </View>
        
        <TextInput style={[styles.descriptionInput, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder={`${getFieldLabel('description')} *`} placeholderTextColor={theme.textSecondary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        
        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('date')} *</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.dateTimeButton, { backgroundColor: theme.surface, borderColor: theme.border.color }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={16} color={theme.accent} />
            <Text style={[styles.dateTimeButtonText, { color: theme.textPrimary }]}>
              {format(eventDateTime, 'dd-MM-yyyy')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateTimeButton, { backgroundColor: theme.surface, borderColor: theme.border.color }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Icon name="clock" size={16} color={theme.accent} />
            <Text style={[styles.dateTimeButtonText, { color: theme.textPrimary }]}>
              {format(eventDateTime, 'HH:mm')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Ticket Type</Text>
        <View style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, justifyContent: 'center' }]}>
          <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Free event only</Text>
        </View>

        <Text style={[styles.label, { color: theme.textPrimary }]}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {['tech', 'corporate', 'social', 'sports', 'arts', 'education', 'health', 'other'].map(cat => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surface,
                    borderColor: isSelected ? theme.accent : theme.border.color,
                  },
                ]}
                onPress={() => {
                  setCategory(cat);
                  useEventsStore.getState().setFilterCategory(cat as EventCategory);
                }}
              >
                <Text style={[styles.catText, { color: isSelected ? theme.accentText : theme.textSecondary }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('venueAddress')} *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]}
            placeholder={`Search ${getFieldLabel('venueAddress').toLowerCase()}...`}
            placeholderTextColor={theme.textSecondary}
            value={addressQuery}
            onChangeText={onAddressInputChange}
          />
          {isSearchingAddress && (
            <View style={styles.addressSearchingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.addressSearchingText, { color: theme.textSecondary }]}>Searching addresses...</Text>
            </View>
          )}
          {showAddressDropdown && (
            <View style={[styles.cityDropdown, { backgroundColor: theme.surface, borderColor: theme.border.color }]}> 
              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                {addressSuggestions.map((item) => (
                  <TouchableOpacity key={`${item.address}-${item.lat}-${item.lng}`} style={styles.cityOption} onPress={() => selectAddress(item)}>
                    <Text style={{ color: theme.textPrimary, fontWeight: '600' }} numberOfLines={1}>{item.address}</Text>
                    {item.city ? <Text style={{ color: theme.textSecondary, marginTop: 2 }}>{item.city}</Text> : null}
                  </TouchableOpacity>
                ))}
                {addressNoResults && (
                  <View style={styles.cityOption}>
                    <Text style={{ color: theme.textSecondary }}>No places found. Try a more specific query.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: theme.surface, borderColor: theme.border.color }]}
            onPress={handleUseCurrentLocation}
            disabled={isLocatingCurrent}
          >
            {isLocatingCurrent ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <>
                <Icon name="crosshair" size={16} color={theme.accent} />
                <Text style={[styles.mapButtonText, { color: theme.textPrimary }]}>Use current location</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mapButton, styles.mapButtonSpaced, { backgroundColor: theme.surface, borderColor: theme.border.color }]}
            onPress={() => setShowMapPicker(true)}
          >
            <Icon name="map-pin" size={16} color={theme.accent} />
            <Text style={[styles.mapButtonText, { color: theme.textPrimary }]}>Pick on map</Text>
          </TouchableOpacity>

          {selectedAddress && mapPin && (
            <View style={[styles.mapSyncedBadge, { borderColor: theme.accent }]}> 
              <Icon name="check-circle" size={14} color={theme.accent} />
              <Text style={[styles.mapSyncedText, { color: theme.textSecondary }]}>Synced with map</Text>
            </View>
          )}
        </View>
        
        <View>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('city')} *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary, opacity: 0.85 }]}
            placeholder="City will be filled from selected address"
            placeholderTextColor={theme.textSecondary}
            value={selectedAddress?.city || ''}
            editable={false}
          />
        </View>

        <TouchableOpacity style={[styles.submitBtn, categoryStyles.createButton]} onPress={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.submitText, categoryStyles.createButtonText]}>{getFieldLabel('submit')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={eventDateTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={eventDateTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      <ThemedAlert visible={alertState.visible} type={alertState.type} title={alertState.title} message={alertState.message} theme={theme} onClose={() => setAlertState({ ...alertState, visible: false })} confirmText={alertState.confirmText} onConfirm={alertState.onConfirm} />

      <Modal visible={showMapPicker} animationType="slide">
        <View style={[styles.mapModalContainer, { backgroundColor: theme.background }]}> 
          <View style={styles.mapModalHeader}>
            <Text style={[styles.mapModalTitle, { color: theme.textPrimary }]}>Choose Event Location</Text>
            <TouchableOpacity onPress={() => setShowMapPicker(false)}>
              <Text style={[styles.mapModalClose, { color: theme.accent }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapSearchContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]}
              placeholder="Search place or city on map"
              placeholderTextColor={theme.textSecondary}
              value={mapSearchQuery}
              onChangeText={setMapSearchQuery}
            />
            {isSearchingMap && (
              <View style={styles.addressSearchingRow}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={[styles.addressSearchingText, { color: theme.textSecondary }]}>Searching map places...</Text>
              </View>
            )}
            {showMapSearchDropdown && (
              <View style={[styles.mapSearchDropdown, { backgroundColor: theme.surface, borderColor: theme.border.color }]}> 
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                  {mapSearchResults.map((item) => (
                    <TouchableOpacity key={`map-${item.address}-${item.lat}-${item.lng}`} style={styles.cityOption} onPress={() => selectMapSearchResult(item)}>
                      <Text style={{ color: theme.textPrimary, fontWeight: '600' }} numberOfLines={1}>{item.address}</Text>
                      {item.city ? <Text style={{ color: theme.textSecondary, marginTop: 2 }}>{item.city}</Text> : null}
                    </TouchableOpacity>
                  ))}
                  {mapSearchNoResults && (
                    <View style={styles.cityOption}>
                      <Text style={{ color: theme.textSecondary }}>No places found. Try hotel, cafe, landmark, or city name.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <WebView
            style={styles.mapView}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            source={{ html: getOpenStreetMapHtml(mapCenter, mapPin) }}
            onMessage={onMapMessage}
          />

          <View style={styles.mapModalFooter}>
            <Text style={[styles.mapHintText, { color: theme.textSecondary }]}>Tap map to drop pin, then confirm location.</Text>
            <TouchableOpacity
              style={[styles.mapConfirmButton, { backgroundColor: theme.accent, opacity: isResolvingMapAddress ? 0.7 : 1 }]}
              onPress={confirmMapLocation}
              disabled={isResolvingMapAddress}
            >
              {isResolvingMapAddress ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <Text style={[styles.mapConfirmButtonText, { color: theme.accentText }]}>Confirm map location</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 40 : 20, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '800' },
  backText: { fontSize: 16, fontWeight: '600' },
  imagePicker: { width: '100%', height: 200, overflow: 'hidden', marginBottom: 24, borderWidth: 2, borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: 12, fontWeight: '600' },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  categoryScroll: { marginBottom: 16 },
  catPill: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catText: { fontWeight: '600', fontSize: 13, lineHeight: 18 },
  input: { height: 50, borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateTimeButton: { flex: 1, height: 50, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateTimeButtonText: { fontSize: 15, fontWeight: '600' },
  descriptionInput: { height: 100, borderRadius: 8, borderWidth: 1, padding: 16, fontSize: 16, textAlignVertical: 'top' },
  priceToggle: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  addressSearchingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  addressSearchingText: { fontSize: 13 },
  cityDropdown: { position: 'absolute', top: 58, left: 0, right: 0, borderWidth: 1, borderRadius: 8, zIndex: 100, elevation: 5 },
  cityOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  mapButton: { marginTop: 12, height: 44, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapButtonSpaced: { marginTop: 10 },
  mapButtonText: { fontSize: 14, fontWeight: '700' },
  mapSyncedBadge: { marginTop: 10, borderWidth: 1, borderRadius: 999, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapSyncedText: { fontSize: 12, fontWeight: '600' },
  mapModalContainer: { flex: 1 },
  mapModalHeader: { paddingTop: Platform.OS === 'ios' ? 54 : 24, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapModalTitle: { fontSize: 20, fontWeight: '800' },
  mapModalClose: { fontSize: 15, fontWeight: '700' },
  mapSearchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  mapSearchDropdown: { marginTop: 6, borderWidth: 1, borderRadius: 8 },
  mapView: { flex: 1 },
  mapModalFooter: { padding: 16, gap: 10 },
  mapHintText: { fontSize: 13 },
  mapConfirmButton: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mapConfirmButtonText: { fontSize: 15, fontWeight: '800' },
  submitBtn: { marginTop: 16, paddingVertical: 16, alignItems: 'center', borderRadius: 8 },
  submitText: { fontSize: 16, fontWeight: '700' },
});