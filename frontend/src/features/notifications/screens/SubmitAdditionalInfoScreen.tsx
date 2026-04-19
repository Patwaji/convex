import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Feather';

import { apiClient } from '../../../shared/api/client';
import { useEventsStore } from '../../events/store/eventsStore';
import { getStylesForCategory, categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../../events/types';

type Props = {
  route: { params: { eventId: string } };
  navigation: any;
};

export default function SubmitAdditionalInfoScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryStyles = getStylesForCategory(activeCategory);
  const theme = categoryThemes[activeCategory];

  const [additionalInfo, setAdditionalInfo] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}`);
      return res.data.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { additionalInfo: string; contactPhone?: string; contactEmail?: string }) =>
      apiClient.post(`/events/${eventId}/submit-info`, data),
    onSuccess: () => {
      Alert.alert('Submitted!', 'Your additional information has been submitted for review.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to submit information');
    },
  });

  const handleSubmit = () => {
    if (additionalInfo.length < 50) {
      Alert.alert('Info Required', 'Please provide at least 50 characters of additional information.');
      return;
    }
    submitMutation.mutate({ additionalInfo, contactPhone: contactPhone || undefined, contactEmail: contactEmail || undefined });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, categoryStyles.container]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, categoryStyles.container]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Additional Info Required</Text>
      </View>

      <View style={[styles.warningCard, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}>
        <Icon name="alert-triangle" size={24} color={theme.accent} />
        <View style={styles.warningContent}>
          <Text style={[styles.warningTitle, { color: theme.textPrimary }]}>Event Under Review</Text>
          <Text style={[styles.warningMessage, { color: theme.textSecondary }]}>
            {event?.flagReason || 'Your event needs additional verification.'}
          </Text>
        </View>
      </View>

      <View style={styles.eventInfo}>
        <Text style={[styles.eventLabel, { color: theme.textSecondary }]}>Event</Text>
        <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{event?.title}</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>
          Additional Information *
          <Text style={{ color: theme.textSecondary, fontWeight: '400' }}> (min 50 characters)</Text>
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }
          ]}
          placeholder="Provide details to verify your event is real (e.g., links to your social media, business website, or other proof of identity)..."
          placeholderTextColor={theme.textSecondary}
          value={additionalInfo}
          onChangeText={setAdditionalInfo}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: additionalInfo.length < 50 ? theme.textSecondary : theme.accent }]}>
          {additionalInfo.length}/50 characters
        </Text>

        <Text style={[styles.label, { color: theme.textPrimary, marginTop: 20 }]}>Contact Phone (Optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }
          ]}
          placeholder="Your phone number for verification"
          placeholderTextColor={theme.textSecondary}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: theme.textPrimary, marginTop: 20 }]}>Contact Email (Optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: theme.surface, borderColor: theme.border.color, color: theme.textPrimary }
          ]}
          placeholder="Your email for verification"
          placeholderTextColor={theme.textSecondary}
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: theme.accent },
            (additionalInfo.length < 50 || submitMutation.isPending) && { opacity: 0.5 }
          ]}
          onPress={handleSubmit}
          disabled={additionalInfo.length < 50 || submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Text style={[styles.submitBtnText, { color: theme.accentText }]}>Submit for Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  warningContent: { flex: 1, marginLeft: 12 },
  warningTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  warningMessage: { fontSize: 14, lineHeight: 20 },
  eventInfo: { marginBottom: 24 },
  eventLabel: { fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  eventTitle: { fontSize: 18, fontWeight: '700' },
  form: {},
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 15, minHeight: 120 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 8 },
  submitBtn: { marginTop: 32, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
});