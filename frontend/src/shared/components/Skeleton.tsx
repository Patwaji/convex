import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export type SpacerProps = {
  height?: number;
};

export const Spacer = ({ height = 16 }: SpacerProps) => (
  <View style={{ height }} />
);

interface ShimmerProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: object;
}

const ShimmerView = ({ width = '100%', height = 20, radius = 4, style }: ShimmerProps) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.shimmerBase, { width, height, borderRadius: radius }, style]}>
      <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX }]}]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

export const EventListSkeleton = () => {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.card}>
          <ShimmerView height={180} style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
          <View style={styles.content}>
            <ShimmerView width={100} height={20} style={{ marginBottom: 8 }} />
            <ShimmerView width={180} height={20} style={{ marginBottom: 4 }} />
            <ShimmerView width={120} height={16} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const ProfileSkeleton = () => {
  return (
    <View style={styles.profileContainer}>
      <ShimmerView width={75} height={75} radius={40} />
      <Spacer height={16} />
      <ShimmerView width={200} height={24} />
      <Spacer height={8} />
      <ShimmerView width={150} height={18} />
      <Spacer height={24} />
      <View style={styles.statsRow}>
        <ShimmerView width={80} height={60} radius={12} />
        <ShimmerView width={80} height={60} radius={12} />
        <ShimmerView width={80} height={60} radius={12} />
      </View>
    </View>
  );
};

export const DetailSkeleton = () => {
  return (
    <View style={styles.detailContainer}>
      <ShimmerView height={250} style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
      <View style={styles.detailContent}>
        <ShimmerView width={220} height={28} />
        <Spacer height={12} />
        <ShimmerView width={160} height={20} />
        <Spacer height={16} />
        <ShimmerView width={280} height={16} style={{ marginBottom: 8 }} />
        <ShimmerView width={250} height={16} style={{ marginBottom: 8 }} />
        <ShimmerView width={180} height={16} />
        <Spacer height={24} />
        <View style={styles.attendeesRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <ShimmerView key={i} width={40} height={40} radius={20} />
          ))}
        </View>
      </View>
    </View>
  );
};

export const ExploreSkeleton = () => {
  return (
    <View style={styles.exploreContainer}>
      <View style={styles.searchBar}>
        <ShimmerView width={24} height={24} radius={12} />
        <ShimmerView width={280} height={40} radius={20} />
      </View>
      <Spacer height={16} />
      <View style={styles.filtersRow}>
        {[1, 2, 3, 4].map((i) => (
          <ShimmerView key={i} width={70} height={36} radius={18} />
        ))}
      </View>
      <Spacer height={20} />
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.nearbyCard}>
          <ShimmerView width={80} height={80} radius={12} />
          <View style={styles.nearbyContent}>
            <ShimmerView width={150} height={18} style={{ marginBottom: 6 }} />
            <ShimmerView width={100} height={14} style={{ marginBottom: 6 }} />
            <ShimmerView width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const NotificationSkeleton = () => {
  return (
    <View style={styles.notificationContainer}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={styles.notificationItem}>
          <ShimmerView width={48} height={48} radius={24} />
          <View style={styles.notificationContent}>
            <ShimmerView width={200} height={16} style={{ marginBottom: 6 }} />
            <ShimmerView width={140} height={14} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerBase: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
  container: {
    paddingHorizontal: 24,
  },
  card: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  profileContainer: {
    padding: 24,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailContainer: {
    flex: 1,
  },
  detailContent: {
    padding: 20,
  },
  attendeesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exploreContainer: {
    padding: 20,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nearbyCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  nearbyContent: {
    flex: 1,
    paddingVertical: 4,
  },
  notificationContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
  },
});