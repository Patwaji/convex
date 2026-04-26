import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, TextInput, Linking, Share, Alert, FlatList } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FastImage from 'react-native-fast-image';
import Icon from '../../../shared/components/AppIcon';
import { format } from 'date-fns';
import { DetailSkeleton } from '../../../shared/components/Skeleton';

import { EventsStackParamList } from '../../../navigation/types';
import { apiClient } from '../../../shared/api/client';
import { CategoryThemeProvider, useCategoryTheme } from '../components/CategoryThemeProvider';
import { useAuthStore } from '../../auth/store/authStore';
import { useEventsStore } from '../store/eventsStore';
import { categoryThemes, EventCategory } from '../../../shared/theme/categoryThemes';
import { triggerGlobalAlert } from '../../../shared/store/globalAlertStore';

type EventDetailScreenRouteProp = RouteProp<EventsStackParamList, 'EventDetail'>;
type EventDetailScreenNavigationProp = StackNavigationProp<EventsStackParamList, 'EventDetail'>;

interface Props {
  route: EventDetailScreenRouteProp;
  navigation: EventDetailScreenNavigationProp;
}

const { height } = Dimensions.get('window');
const DETAIL_CARD_RADIUS = 28;
const DETAIL_BUTTON_RADIUS = 16;

function EventDetailContent({ navigation, route }: { navigation: EventDetailScreenNavigationProp; route: any }) {
  const { theme } = useCategoryTheme();
  const eventId = route?.params?.id;
  const routeCategory = route?.params?.category;
  const currentUser = useAuthStore(state => state.user);
  const setActiveDetailCategory = useEventsStore(state => state.setActiveDetailCategory);
  const clearActiveDetailCategory = useEventsStore(state => state.clearActiveDetailCategory);
  const queryClient = useQueryClient();
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [deleteReason, setDeleteReason] = React.useState('');
  const [lookupCode, setLookupCode] = React.useState('');
  const [lookupResult, setLookupResult] = React.useState<any>(null);
  const [lookupError, setLookupError] = React.useState('');
  const [isLookingUp, setIsLookingUp] = React.useState(false);

  const openMaps = () => {
    const address = `${event.venue.address}, ${event.venue.city}`;
    const encodedAddress = encodeURIComponent(address);
    
    const lat = event.venue?.location?.coordinates?.[1];
    const lng = event.venue?.location?.coordinates?.[0];
    
    let url = '';
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.apple.com/?q=${encodedAddress}`);
    });
  };

  const shareEvent = async () => {
    try {
      const message = `Check out "${event.title}" on ${format(new Date(event.date), 'MMMM d, yyyy')} at ${format(new Date(event.date), 'h:mm a')}!\n\n📍 ${event.venue.address}, ${event.venue.city}`;
      
      await Share.share({
        message,
        title: event.title,
      });
    } catch (error: any) {
      triggerGlobalAlert({
        type: 'error',
        title: 'SHARE FAILED',
        message: error.message || 'Could not share event',
      });
    }
  };

  const addToCalendar = () => {
    const eventStartDate = new Date(event.date);
    const eventEndDate = event.endDate ? new Date(event.endDate) : new Date(eventStartDate.getTime() + 2 * 60 * 60 * 1000);

    const config = {
      title: event.title,
      startDate: eventStartDate.toISOString(),
      endDate: eventEndDate.toISOString(),
      location: `${event.venue.address}, ${event.venue.city}`,
      notes: event.description,
    };

    try {
      const { addEventAsync } = require('react-native-add-calendar-event');
      addEventAsync(config)
        .then((result: string) => {
          triggerGlobalAlert({
            type: 'success',
            title: 'ADDED TO CALENDAR',
            message: 'Event has been added to your calendar',
          });
        })
        .catch((error: any) => {
          triggerGlobalAlert({
            type: 'error',
            title: 'CALENDAR ERROR',
            message: error.message || 'Could not add event to calendar',
          });
        });
    } catch {
      triggerGlobalAlert({
        type: 'error',
        title: 'CALENDAR ERROR',
        message: 'Please add the event to your calendar manually',
      });
    }
  };

  useEffect(() => {
    if (routeCategory && routeCategory in categoryThemes) {
      setActiveDetailCategory(routeCategory as EventCategory);
    }

    return () => {
      clearActiveDetailCategory();
    };
  }, [clearActiveDetailCategory, routeCategory, setActiveDetailCategory]);

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

  const { data: similarEvents } = useQuery({
    queryKey: ['similarEvents', eventId],
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/similar`);
      return res.data.data as any[];
    },
    enabled: !!eventId,
  });

  useEffect(() => {
    if (event?.category && event.category in categoryThemes) {
      setActiveDetailCategory(event.category as EventCategory);
    }
  }, [event?.category, setActiveDetailCategory]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      console.log('RSVP: Post to /events/' + eventId + '/join');
      const res = await apiClient.post(`/events/${eventId}/join`, {});
      console.log('RSVP response:', res.data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      triggerGlobalAlert({
        type: 'success',
        title: 'RSVP CONFIRMED',
        message: 'You have joined this event.',
      });
    },
    onError: (error: any) => {
      console.log('RSVP error:', error, error?.response?.data?.error);
      const errorMsg = error?.response?.data?.error?.message || '';
      const isAlreadyJoined = errorMsg.includes('already') || error?.response?.status === 409;
      
      triggerGlobalAlert({
        type: isAlreadyJoined ? 'warning' : 'error',
        title: isAlreadyJoined ? 'ALREADY JOINED' : 'RSVP FAILED',
        message: isAlreadyJoined ? 'You have already joined this event' : (error?.response?.data?.error?.message || 'Failed to RSVP - try again'),
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => apiClient.post(`/events/${eventId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      triggerGlobalAlert({
        type: 'info',
        title: 'RSVP REMOVED',
        message: 'You have left this event.',
      });
    },
    onError: (error: any) => {
      triggerGlobalAlert({
        type: 'error',
        title: 'LEAVE FAILED',
        message: error?.response?.data?.error?.message || 'Failed to leave event',
      });
    },
  });

  const requestDeleteMutation = useMutation({
    mutationFn: async () => apiClient.post(`/events/${eventId}/request-delete`, { reason: deleteReason.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      setDeleteModalVisible(false);
      setDeleteReason('');
      triggerGlobalAlert({
        type: 'success',
        title: 'DELETE REQUEST SENT',
        message: 'Admin review is required before this event is removed.',
      });
    },
    onError: (error: any) => {
      triggerGlobalAlert({
        type: 'error',
        title: 'REQUEST FAILED',
        message: error?.response?.data?.error?.message || 'Could not submit delete request',
      });
    },
  });

  const verifyAttendeeMutation = useMutation({
    mutationFn: async ({ attendeeId, verificationCode }: { attendeeId: string; verificationCode: string }) =>
      apiClient.post(`/events/${eventId}/verify-attendee`, { attendeeId, verificationCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      triggerGlobalAlert({
        type: 'success',
        title: 'ATTENDEE VERIFIED',
        message: 'Verification marked successfully.',
      });
    },
    onError: (error: any) => {
      triggerGlobalAlert({
        type: 'error',
        title: 'VERIFICATION FAILED',
        message: error?.response?.data?.error?.message || 'Could not verify attendee',
      });
    },
});

  const handleLookupCode = async () => {
    if (!lookupCode.trim() || isLookingUp) return;
    
    const code = lookupCode.trim().toUpperCase();
    const attendee = event.attendees?.find((a: any) => a.verificationCode?.toUpperCase() === code);
    
    if (attendee) {
      setLookupResult(attendee);
      setLookupError('');
    } else {
      setLookupResult(null);
      setLookupError('No attendee found with this code');
    }
  };

  const handleVerifyLookupedAttendee = () => {
    if (lookupResult && !lookupResult.verified) {
      verifyAttendeeMutation.mutate({ 
        attendeeId: lookupResult._id, 
        verificationCode: lookupResult.verificationCode 
      });
    }
  };

  if (isLoading || !event) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <DetailSkeleton />
      </View>
    );
  }

  const isJoined = event.attendees?.some((a: any) => a._id === currentUser?._id);
  const isOrganizer = event.organizer._id === currentUser?._id;
  const isFull = event.maxAttendees && event.attendees.length >= event.maxAttendees;
  const isAdmin = currentUser?.role === 'admin';

  const showJoinButton = !isOrganizer && !isAdmin;
  const showDeleteButton = isOrganizer && !isAdmin;
  const deletePending = event.deletionRequest?.status === 'pending';

  const handleJoinPress = () => {
    if (isJoined) {
      leaveMutation.mutate();
      return;
    }

    joinMutation.mutate();
  };

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
              <View style={styles.metaTextContent}>
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
              <View style={styles.metaTextContent}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.metaValue, { color: theme.textPrimary }]}>{event.venue.address}</Text>
                <Text style={[styles.metaSubValue, { color: theme.textSecondary }]}>{event.venue.city}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.directionsButton, { backgroundColor: theme.accent + '15', borderColor: theme.accent }]}
              onPress={openMaps}
            >
              <Icon name="navigation" size={16} color={theme.accent} />
              <Text style={[styles.directionsButtonText, { color: theme.accent }]}>Get Directions</Text>
            </TouchableOpacity>
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

          {isJoined && !!event.myVerificationCode && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Your RSVP Verification Code</Text>
              <View style={[styles.verificationCard, { backgroundColor: theme.surface, borderColor: theme.border?.color || '#E2E8F0' }]}>
                <Text style={[styles.verificationCode, { color: theme.accent }]}>{event.myVerificationCode}</Text>
                <Text style={[styles.verificationHint, { color: theme.textSecondary }]}>Show this only to the organizer for check-in verification.</Text>
              </View>
            </>
          )}

          {isOrganizer && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Verify Attendee</Text>
              <Text style={[styles.description, { color: theme.textSecondary, marginBottom: 12 }]}>
                Enter a verification code to find and verify an attendee
              </Text>
              
              <View style={[styles.lookupContainer, { backgroundColor: theme.surface, borderColor: theme.border?.color || '#E2E8F0' }]}>
                <TextInput
                  style={[styles.lookupInput, { color: theme.textPrimary, backgroundColor: theme.background }]}
                  placeholder="Enter verification code"
                  placeholderTextColor={theme.textSecondary}
                  value={lookupCode}
                  onChangeText={(text) => {
                    setLookupCode(text);
                    setLookupResult(null);
                    setLookupError('');
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.lookupButton, { backgroundColor: theme.accent }]}
                  onPress={handleLookupCode}
                  disabled={isLookingUp || !lookupCode.trim()}
                >
                  <Icon name="search" size={18} color={theme.accentText} />
                </TouchableOpacity>
              </View>

              {lookupError ? (
                <Text style={[styles.lookupError, { color: '#EF4444' }]}>{lookupError}</Text>
              ) : null}

              {lookupResult && (
                <View style={[styles.attendeeCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                  <View style={styles.attendeeHeader}>
                    <View>
                      <Text style={[styles.attendeeName, { color: theme.textPrimary }]}>{lookupResult.name || 'Attendee'}</Text>
                      {lookupResult.gender && (
                        <Text style={[styles.attendeeDetail, { color: theme.textSecondary }]}>Gender: {lookupResult.gender}</Text>
                      )}
                      {lookupResult.dateOfBirth && (
                        <Text style={[styles.attendeeDetail, { color: theme.textSecondary }]}>DOB: {new Date(lookupResult.dateOfBirth).toLocaleDateString()}</Text>
                      )}
                    </View>
                    <Text style={[styles.attendeeStatus, { color: lookupResult.verified ? '#10B981' : '#F59E0B' }]}>
                      {lookupResult.verified ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                  <Text style={[styles.attendeeCode, { color: theme.accent }]}>Code: {lookupResult.verificationCode || 'Not available'}</Text>
                  {!lookupResult.verified && lookupResult.verificationCode && (
                    <TouchableOpacity
                      style={[styles.verifyButton, { borderColor: theme.accent }]}
                      onPress={handleVerifyLookupedAttendee}
                      disabled={verifyAttendeeMutation.isPending}
                    >
                      <Text style={[styles.verifyButtonText, { color: theme.accent }]}>Mark Verified</Text>
                    </TouchableOpacity>
                  )}
                  {lookupResult.verified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: '#10B98120' }]}>
                      <Icon name="check-circle" size={14} color="#10B981" />
                      <Text style={[styles.verifiedBadgeText, { color: '#10B981' }]}>This attendee has been verified</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Registered People ({event.attendees?.length || 0})</Text>
              {(event.attendees || []).length === 0 ? (
                <Text style={[styles.description, { color: theme.textSecondary }]}>No RSVPs yet.</Text>
              ) : (
                (event.attendees || []).map((attendee: any) => (
                  <View
                    key={attendee._id}
                    style={[styles.attendeeCard, { backgroundColor: theme.surface, borderColor: theme.border?.color || '#E2E8F0' }]}
                  >
                    <View style={styles.attendeeHeader}>
                      <Text style={[styles.attendeeName, { color: theme.textPrimary }]}>{attendee.name || 'Attendee'}</Text>
                      <Text style={[styles.attendeeStatus, { color: attendee.verified ? '#10B981' : '#F59E0B' }]}>
                        {attendee.verified ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                    <Text style={[styles.attendeeCode, { color: theme.accent }]}>Code: {attendee.verificationCode || 'Not available'}</Text>
                    {!attendee.verified && attendee.verificationCode && (
                      <TouchableOpacity
                        style={[styles.verifyButton, { borderColor: theme.accent }]}
                        onPress={() => verifyAttendeeMutation.mutate({ attendeeId: attendee._id, verificationCode: attendee.verificationCode })}
                        disabled={verifyAttendeeMutation.isPending}
                      >
                        <Text style={[styles.verifyButtonText, { color: theme.accent }]}>Mark Verified</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </>
          )}

        {similarEvents && similarEvents.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Similar Events</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={similarEvents}
                keyExtractor={(item) => item._id}
                renderItem={({ item: similarEvent }) => (
                  <TouchableOpacity
                    style={[styles.similarEventCard, { backgroundColor: theme.surface, borderColor: theme.border.color }]}
                    onPress={() => {
                      setActiveDetailCategory(similarEvent.category as EventCategory);
                      navigation.push('EventDetail', { id: similarEvent._id, category: similarEvent.category });
                    }}
                  >
                    <FastImage
                      style={styles.similarEventImage}
                      source={{ uri: similarEvent.coverImage || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&q=80' }}
                    />
                    <View style={styles.similarEventContent}>
                      <Text style={[styles.similarEventTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                        {similarEvent.title}
                      </Text>
                      <Text style={[styles.similarEventDate, { color: theme.textSecondary }]}>
                        {format(new Date(similarEvent.date), 'MMM d, h:mm a')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.similarEventsContent}
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actionsRow, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: theme.accent + '15', borderColor: theme.accent }]}
          onPress={shareEvent}
        >
          <Icon name="share-2" size={18} color={theme.accent} />
          <Text style={[styles.actionChipText, { color: theme.accent }]}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: theme.accent + '15', borderColor: theme.accent }]}
          onPress={addToCalendar}
        >
          <Icon name="calendar" size={18} color={theme.accent} />
          <Text style={[styles.actionChipText, { color: theme.accent }]}>Add to Calendar</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.background }]}>
        {showJoinButton && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isJoined ? theme.background : theme.accent },
              (isFull && !isJoined) && { backgroundColor: theme.textSecondary }
            ]}
            disabled={!!(joinMutation.isPending || leaveMutation.isPending || (isFull && !isJoined))}
            onPress={handleJoinPress}
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

        {isOrganizer && (
          <TouchableOpacity
            style={[
              styles.duplicateButton,
              { borderColor: theme.accent },
            ]}
            onPress={() => {
              navigation.navigate('CreateEvent', { 
                draftId: `duplicate_${event._id}` 
              });
            }}
          >
            <Icon name="copy" size={16} color={theme.accent} />
            <Text style={[styles.duplicateButtonText, { color: theme.accent }]}>
              Duplicate
            </Text>
          </TouchableOpacity>
        )}

        {showDeleteButton && (
          <TouchableOpacity
            style={[
              styles.deleteButton,
              { borderColor: deletePending ? theme.textSecondary : '#EF4444' },
            ]}
            onPress={() => setDeleteModalVisible(true)}
            disabled={deletePending || requestDeleteMutation.isPending}
          >
            <Text style={[styles.deleteButtonText, { color: deletePending ? theme.textSecondary : '#EF4444' }]}>
              {deletePending ? 'Delete Pending Admin' : 'Request Delete'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border?.color || '#E2E8F0' }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Request Event Deletion</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>Admin approval is required before this event is removed.</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.border?.color || '#E2E8F0', color: theme.textPrimary }]}
              placeholder="Reason (optional)"
              placeholderTextColor={theme.textSecondary}
              value={deleteReason}
              onChangeText={setDeleteReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonGhost]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#EF4444' }]} onPress={() => requestDeleteMutation.mutate()}>
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderTopLeftRadius: DETAIL_CARD_RADIUS,
    borderTopRightRadius: DETAIL_CARD_RADIUS,
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
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1, lineHeight: 16 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 24, lineHeight: 40 },
  metaContainer: { gap: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start' },
  metaTextContent: { flex: 1, minWidth: 0 },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  metaLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: '700', marginBottom: 2, flexShrink: 1 },
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
    borderTopLeftRadius: DETAIL_CARD_RADIUS,
    borderTopRightRadius: DETAIL_CARD_RADIUS,
    padding: 24,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  actionButton: { minWidth: 220, paddingHorizontal: 32, paddingVertical: 16, borderRadius: DETAIL_BUTTON_RADIUS, alignItems: 'center' },
  actionButtonText: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  deleteButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: DETAIL_BUTTON_RADIUS,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: DETAIL_BUTTON_RADIUS,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  duplicateButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalButtonGhost: {
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  verificationCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  verificationCode: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  verificationHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  attendeeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  attendeeStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  attendeeCode: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifyButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lookupContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  lookupInput: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
    backgroundColor: 'transparent',
  },
  lookupButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  lookupError: {
    fontSize: 13,
    marginBottom: 12,
  },
  attendeeDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  directionsButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  similarEventsContent: {
    paddingRight: 24,
  },
  similarEventCard: {
    width: 180,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  similarEventImage: {
    width: '100%',
    height: 100,
  },
  similarEventContent: {
    padding: 12,
  },
  similarEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  similarEventDate: {
    fontSize: 12,
  },
});
