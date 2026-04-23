import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { format } from 'date-fns';
import Icon from '../../../shared/components/AppIcon';
import { Event } from '../types';
import { categoryThemes, CATEGORY_COLORS } from '../../../shared/theme/categoryThemes';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const CARD_RADIUS = 28;

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const theme = categoryThemes.other;
  const categoryColor = CATEGORY_COLORS[(event.category as keyof typeof CATEGORY_COLORS) || 'other'] || categoryThemes.other.accent;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={[
        styles.card, 
        { 
          backgroundColor: theme.surface,
          borderRadius: CARD_RADIUS,
          borderWidth: 1,
          borderColor: theme.border.color,
          shadowColor: theme.shadow.color,
          elevation: theme.cardElevation,
        }
      ]}
    >
      <View style={styles.imageContainer}>
        <FastImage
          style={[
            styles.image, 
            { borderTopLeftRadius: CARD_RADIUS, borderTopRightRadius: CARD_RADIUS }
          ]}
          source={{
            uri: event.coverImage || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
            priority: FastImage.priority.normal,
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>
      
      <View style={[
        styles.badge, 
        { backgroundColor: categoryColor }
      ]}>
        <Text style={[
          styles.badgeText, 
          { color: '#FFFFFF' }
        ]}>
          {(event.category || 'other').toUpperCase()}
        </Text>
      </View>

      {event.isRecommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: '#10B981' }]}>
          <Icon name="star" size={10} color="#FFFFFF" />
          <Text style={styles.recommendedText}>For You</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={2}>
          {event.title}
        </Text>
        
        <View style={styles.detailsRow}>
          <Icon 
            name="calendar" 
            size={14} 
            color={theme.textSecondary}
          />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {format(new Date(event.date), 'EEE, MMM d • h:mm a')}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <Icon name="map-pin" size={14} color={theme.textSecondary} />
          <Text style={[styles.dateText, { color: theme.textSecondary }]} numberOfLines={1}>
            {event.venue.address || event.venue.city}
          </Text>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.organizer}>
            <FastImage
              style={styles.avatar}
              source={{
                uri: event.organizer?.avatar || 'https://ui-avatars.com/api/?name=' + (event.organizer?.name || 'O') + '&background=random',
              }}
            />
            <Text style={[styles.organizerName, { color: theme.textSecondary }]} numberOfLines={1}>
              {event.organizer?.name || 'Unknown Organizer'}
            </Text>
          </View>
          
          <Text style={[styles.price, { color: categoryColor }]}>
            FREE
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width - 48,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 14,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 28,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  organizer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  organizerName: {
    fontSize: 13,
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
  },
});