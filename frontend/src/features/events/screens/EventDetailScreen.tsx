import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import { format } from 'date-fns';

import { EventsStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../shared/api/client';
import { CategoryThemeProvider, useCategoryTheme } from '../components/CategoryThemeProvider';
import { useAuthStore } from '../../auth/store/authStore';

type EventDetailScreenRouteProp = RouteProp<EventsStackParamList, 'EventDetail'>;
type EventDetailScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'EventDetail'>;

interface Props {
  route: EventDetailScreenRouteProp;
  navigation: EventDetailScreenNavigationProp;
}

const { height } = Dimensions.get('window');

function EventDetailContent({ navigation, route }: { navigation: EventDetailScreenNavigationProp; route: any }) {
  const { theme } = useCategoryTheme();
  const eventId = route?.params?.id;
  const currentUser = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

  if (!eventId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Event not found</Text>
      </View>
    );
  }

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}`);
      return res.data.data;
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => apiClient.post(`/events/${eventId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => apiClient.post(`/events/${eventId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  if (isLoading || !event) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const isJoined = event.attendees?.some((a: any) => a._id === currentUser?._id);
  const isOrganizer = event.organizer._id === currentUser?._id;
  const isFull = event.maxAttendees && event.attendees.length >= event.maxAttendees;
  const isAdmin = currentUser?.role === 'admin';

  const showJoinButton = !isOrganizer && !isAdmin;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.imageContainer}>
          <FastImage
            style={styles.image}
            source={{ uri: event.coverImage || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80' }}
          />
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.badgeText, { color: theme.accentText }]}>
              {event.category.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>{event.title}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                <Icon name="calendar" size={20} color={theme.accent} />
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Date & Time</Text>
                <Text style={[styles.metaValue, { color: theme.textPrimary }]}>
                  {format(new Date(event.date), 'EEEE, MMMM d')}
                </Text>
                <Text style={[styles.metaSubValue, { color: theme.textSecondary }]}>
                  {format(new Date(event.date), 'h:mm a')}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                <Icon name="map-pin" size={20} color={theme.accent} />
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.metaValue, { color: theme.textPrimary }]}>{event.venue.name}</Text>
                <Text style={[styles.metaSubValue, { color: theme.textSecondary }]}>{event.venue.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>About Event</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{event.description}</Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Organizer</Text>
          <View style={styles.organizerRow}>
            <FastImage
              style={styles.avatar}
              source={{ uri: event.organizer.avatar || `https://ui-avatars.com/api/?name=${event.organizer.name}` }}
            />
            <Text style={[styles.organizerName, { color: theme.textPrimary }]}>{event.organizer.name}</Text>
          </View>

        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.background }]}>
        <View>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Price</Text>
          <Text style={[styles.priceValue, { color: theme.textPrimary }]}>
            {event.isFree ? 'Free' : `$${event.ticketPrice}`}
          </Text>
        </View>

        {showJoinButton && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isJoined ? theme.background : theme.accent },
              (isFull && !isJoined) && { backgroundColor: theme.textSecondary }
            ]}
            disabled={joinMutation.isPending || leaveMutation.isPending || (isFull && !isJoined)}
            onPress={() => isJoined ? leaveMutation.mutate() : joinMutation.mutate()}
          >
            {(joinMutation.isPending || leaveMutation.isPending) ? (
              <ActivityIndicator color={isJoined ? theme.accent : theme.accentText} />
            ) : (
              <Text style={[
                styles.actionButtonText, 
                { color: isJoined ? theme.textPrimary : theme.accentText }
              ]}>
                {isJoined ? 'Leave Event' : isFull ? 'Sold Out' : 'Join Event'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function EventDetailScreen(props: Props) {
  // Use initial category from params for eager theming before fetch completes
  return (
    <CategoryThemeProvider category={props.route.params.category}>
      <EventDetailContent navigation={props.navigation} route={props.route} />
    </CategoryThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: height * 0.4 },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    backgroundColor: 'inherit',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 24, lineHeight: 40 },
  metaContainer: { gap: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  metaLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  metaSubValue: { fontSize: 14 },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 26 },
  organizerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  organizerName: { fontSize: 16, fontWeight: '600' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  priceLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  priceValue: { fontSize: 24, fontWeight: '800' },
  actionButton: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  actionButtonText: { fontSize: 16, fontWeight: '700' },
});
