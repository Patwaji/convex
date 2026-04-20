import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Feather';
import { Event, EventCategory } from '../types';
import { categoryThemes, getStylesForCategory } from '../../../shared/theme/categoryThemes';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

const { width } = Dimensions.get('window');

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const category = (event.category && categoryThemes[event.category as EventCategory]) 
    ? (event.category as EventCategory) 
    : 'other';
    
  const theme = categoryThemes[category];
  const categoryStyles = getStylesForCategory(category);

  const isTech = category === 'tech';
  const isSports = category === 'sports';
  const isArts = category === 'arts';

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={[
        styles.card, 
        categoryStyles.card,
        { 
          backgroundColor: theme.surface,
          borderRadius: theme.borderRadius,
          shadowColor: theme.shadow.color,
          elevation: theme.cardElevation,
        },
        isTech && {
          borderWidth: 1,
          borderColor: '#00F0FF33',
          shadowColor: '#00F0FF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 0,
        },
        isSports && {
          borderWidth: 2,
          borderColor: '#FFD700',
          shadowColor: '#FFD700',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 0,
          elevation: 0,
        },
        isArts && {
          borderWidth: 1,
          borderColor: '#D4AF3744',
        }
      ]}
    >
      <View style={styles.imageContainer}>
        <FastImage
          style={[
            styles.image, 
            { borderTopLeftRadius: theme.borderRadius, borderTopRightRadius: theme.borderRadius }
          ]}
          source={{
            uri: event.coverImage || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
            priority: FastImage.priority.normal,
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
        {isTech && (
          <View style={styles.techScanLine} />
        )}
      </View>
      
      <View style={[
        styles.badge, 
        categoryStyles.badge,
        { backgroundColor: theme.accent }
      ]}>
        <Text style={[
          styles.badgeText, 
          { color: theme.accentText }
        ]}>
          {isTech ? '< ' + category.toUpperCase() + ' >' : 
           isSports ? '[ ' + category.toUpperCase() + ' ]' :
           isArts ? category.toUpperCase() + ' ×' :
           category.toUpperCase()}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={2}>
          {event.title}
        </Text>
        
        <View style={styles.detailsRow}>
          <Icon 
            name="calendar" 
            size={14} 
            color={theme.textSecondary}
            style={isTech && categoryStyles.iconGlow} 
          />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {isTech ? format(new Date(event.date), 'yyyy-MM-dd HH:mm') : 
             format(new Date(event.date), 'EEE, MMM d • h:mm a')}
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
              style={[
                styles.avatar,
                isTech && { borderWidth: 1, borderColor: '#00F0FF44' }
              ]}
              source={{
                uri: event.organizer?.avatar || 'https://ui-avatars.com/api/?name=' + (event.organizer?.name || 'O') + '&background=random',
              }}
            />
            <Text style={[styles.organizerName, { color: theme.textSecondary }]} numberOfLines={1}>
              {event.organizer?.name || 'Unknown Organizer'}
            </Text>
          </View>
          
          <Text style={[styles.price, { color: theme.accent }]}>
            {isTech ? event.isFree ? '0x00' : `0x${event.ticketPrice}` :
             event.isFree ? 'FREE' : `$${event.ticketPrice}`}
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
  techScanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00F0FF',
    opacity: 0.6,
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