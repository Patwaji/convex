import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, FlatList, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'react-native-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';

import { EventsStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../shared/api/client';
import { useEventsStore } from '../store/eventsStore';
import { getStylesForCategory, categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';
import ThemedAlert from '../../../shared/components/ThemedAlert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Indian cities for autocomplete
const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Surat', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Vadodara', 'Ghaziabad', 'Ludhiana',
  'Coimbatore', 'Kochi', 'Patna', 'Rajkot', 'Meerut', 'Varanasi', 'Srinagar', 'Jodhpur', 'Ranchi', 'Chandigarh',
  'Mysore', 'Gwalior', 'Madurai', 'Jabalpur', 'Nashik', 'Faridabad', 'Allahabad', 'Hubli', 'Dhanbad', 'Amritsar',
  'Warangal', 'Guntur', 'Bhubaneswar', 'Belgaum', 'Sangli', 'Jamshedpur', 'Kolhapur', 'Navi Mumbai', 'Ulhasnagar',
  'Solapur', 'Tiruchirappalli', 'Bareilly', 'Aligarh', 'Bikaner', 'Noida', 'Firozabad', 'Moradabad', 'Jalandhar',
];

type CreateEventScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'CreateEvent'>;

interface Props {
  navigation: CreateEventScreenNavigationProp;
}

export default function CreateEventScreen({ navigation }: Props) {
  const filterCategory = useEventsStore(state => state.filterCategory);
  const initialCategory = filterCategory === 'all' ? 'other' : filterCategory;
  
  const [category, setCategory] = useState<string>(initialCategory);
  
  const activeCategory = category as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const theme = categoryThemes[activeCategory];
  
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, Record<string, string>> = {
      tech: { title: 'Project Name', description: 'Technical Brief', venueName: 'Lab Location', venueAddress: 'Lab Address', city: 'Tech Hub', image: 'Upload Blueprint', submit: 'Initialize', date: 'Date & Time' },
      corporate: { title: 'Event Title', description: 'Business Brief', venueName: 'Conference Room', venueAddress: 'Office Address', city: 'Business District', image: 'Company Logo', submit: 'Submit Proposal', date: 'Date & Time' },
      social: { title: 'Event Name', description: 'What\'s the vibe?', venueName: 'Party Spot', venueAddress: 'Location', city: 'Where at?', image: 'Add Photo', submit: 'Let\'s Go!', date: 'When?' },
      sports: { title: 'Match Title', description: 'Event Details', venueName: 'Arena / Field', venueAddress: 'Venue Address', city: 'City', image: 'Team Logo', submit: 'Game On', date: 'Match Time' },
      arts: { title: 'Artwork Title', description: 'About the Piece', venueName: 'Gallery / Venue', venueAddress: 'Location', city: 'City', image: 'Upload Artwork', submit: 'Exhibit', date: 'Exhibition Date' },
      education: { title: 'Course Title', description: 'Course Details', venueName: 'Institute', venueAddress: 'Address', city: 'Campus', image: 'Course Image', submit: 'Start Course', date: 'Start Date' },
      health: { title: 'Session Name', description: 'Session Details', venueName: 'Wellness Center', venueAddress: 'Studio Address', city: 'Location', image: 'Add Image', submit: 'Join Session', date: 'Session Time' },
      other: { title: 'Event Title', description: 'Description', venueName: 'Venue Name', venueAddress: 'Address', city: 'City', image: 'Add Cover Image', submit: 'Submit', date: 'Date & Time' },
    };
    return labels[category]?.[field] || labels.other[field];
  };
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [ticketPrice, setTicketPrice] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; confirmText?: string; onConfirm?: () => void }>({ visible: false, type: 'info', title: '', message: '' });

  const queryClient = useQueryClient();

  const handleCityChange = (text: string) => {
    setCity(text);
    if (text.length > 0) {
      const filtered = INDIAN_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 6);
      setCitySuggestions(filtered);
      setShowCityDropdown(filtered.length > 0);
    } else {
      setCitySuggestions([]);
      setShowCityDropdown(false);
    }
  };

  const selectCity = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityDropdown(false);
    setCitySuggestions([]);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiClient.post('/events', data),
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
      setAlertState({
        visible: true,
        type: 'error',
        title: '◆ ERROR',
        message: error.response?.data?.error?.message || 'Failed to create event',
      });
    }
  });

  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 }, (response) => {
      if (response.assets && response.assets.length > 0) setImageUri(response.assets[0].uri!);
    });
  };

  const getCurrentDateTime = () => {
    const d = new Date(Date.now() + 86400000);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleCreate = () => {
    if (!title || !description || !venueName || !venueAddress || !city || !dateStr) {
      setAlertState({ visible: true, type: 'warning', title: '◆ INCOMPLETE', message: 'Please fill in all required fields' });
      return;
    }

    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const eventDate = new Date(year, month - 1, day, hours, minutes);

    createMutation.mutate({
      title,
      description,
      category,
      date: eventDate.toISOString(),
      venue: { name: venueName, address: venueAddress, city, location: { type: 'Point', coordinates: [77.1025, 28.7041] } },
      coverImage: imageUri,
      isFree,
      ticketPrice: isFree ? 0 : parseFloat(ticketPrice) || 0,
    });
  };

  return (
    <ScrollView style={[styles.container, categoryStyles.container]} contentContainerStyle={styles.content}>
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
        
        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('date')} * (DD-MM-YYYY HH:MM)</Text>
        <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder={getCurrentDateTime()} placeholderTextColor={theme.textSecondary} value={dateStr} onChangeText={setDateStr} />

        <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Ticket Price</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity style={[styles.priceToggle, { backgroundColor: isFree ? theme.accent : theme.surface, borderColor: theme.border.color }]} onPress={() => setIsFree(true)}>
            <Text style={{ color: isFree ? theme.accentText : theme.textSecondary, fontWeight: '600' }}>Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.priceToggle, { backgroundColor: !isFree ? theme.accent : theme.surface, borderColor: theme.border.color }]} onPress={() => setIsFree(false)}>
            <Text style={{ color: !isFree ? theme.accentText : theme.textSecondary, fontWeight: '600' }}>Paid</Text>
          </TouchableOpacity>
        </View>

        {!isFree && (
          <View>
            <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder="Enter ticket price (₹)" placeholderTextColor={theme.textSecondary} value={ticketPrice} onChangeText={setTicketPrice} keyboardType="numeric" />
          </View>
        )}

        <Text style={[styles.label, { color: theme.textPrimary }]}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {['tech', 'corporate', 'social', 'sports', 'arts', 'education', 'health', 'other'].map(cat => {
            const isSelected = category === cat;
            const catTheme = categoryThemes[cat as EventCategory];
            return (
              <TouchableOpacity key={cat} style={[styles.catPill, { backgroundColor: isSelected ? catTheme.accent : catTheme.surface, borderColor: catTheme.border.color }]} onPress={() => setCategory(cat)}>
                <Text style={[styles.catText, { color: isSelected ? catTheme.accentText : catTheme.textSecondary }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('venueName')} *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder={`Enter ${getFieldLabel('venueName').toLowerCase()}`} placeholderTextColor={theme.textSecondary} value={venueName} onChangeText={setVenueName} />
        </View>
        
        <View>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('venueAddress')} *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder={`Enter ${getFieldLabel('venueAddress').toLowerCase()}`} placeholderTextColor={theme.textSecondary} value={venueAddress} onChangeText={setVenueAddress} />
        </View>
        
        <View>
          <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{getFieldLabel('city')} *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }]} placeholder={`Enter ${getFieldLabel('city').toLowerCase()}`} placeholderTextColor={theme.textSecondary} value={city} onChangeText={handleCityChange} />
          {showCityDropdown && (
            <View style={[styles.cityDropdown, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
              <FlatList data={citySuggestions} keyExtractor={(item) => item} renderItem={({ item }) => (
                <TouchableOpacity style={styles.cityOption} onPress={() => selectCity(item)}>
                  <Text style={{ color: theme.textPrimary }}>{item}</Text>
                </TouchableOpacity>
              )} style={{ maxHeight: 150 }} />
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.submitBtn, categoryStyles.createButton]} onPress={handleCreate} disabled={createMutation.isPending}>
          <Text style={[styles.submitText, categoryStyles.createButtonText]}>{getFieldLabel('submit')}</Text>
        </TouchableOpacity>
      </View>

      <ThemedAlert visible={alertState.visible} type={alertState.type} title={alertState.title} message={alertState.message} theme={theme} onClose={() => setAlertState({ ...alertState, visible: false })} confirmText={alertState.confirmText} onConfirm={alertState.onConfirm} />
    </ScrollView>
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
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  catText: { fontWeight: '600', fontSize: 13 },
  input: { height: 50, borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  descriptionInput: { height: 100, borderRadius: 8, borderWidth: 1, padding: 16, fontSize: 16, textAlignVertical: 'top' },
  priceToggle: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  cityDropdown: { position: 'absolute', top: 58, left: 0, right: 0, borderWidth: 1, borderRadius: 8, zIndex: 100, elevation: 5 },
  cityOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  submitBtn: { marginTop: 16, paddingVertical: 16, alignItems: 'center', borderRadius: 8 },
  submitText: { fontSize: 16, fontWeight: '700' },
});