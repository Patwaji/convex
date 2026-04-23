import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import Icon from './AppIcon';
import { categoryThemes, CategoryTheme } from '../../shared/theme/categoryThemes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ThemedAlertProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  theme?: CategoryTheme;
  onClose: () => void;
  confirmText?: string;
  onConfirm?: () => void;
}

const getTypeConfig = (type: string, accentColor: string) => {
  const configs = {
    success: {
      icon: 'check-circle',
      color: '#10B981',
    },
    error: {
      icon: 'x-circle',
      color: '#EF4444',
    },
    warning: {
      icon: 'alert-triangle',
      color: '#F59E0B',
    },
    info: {
      icon: 'circle',
      color: accentColor,
    },
  };
  return configs[type as keyof typeof configs] || configs.info;
};

export default function ThemedAlert({ 
  visible, 
  type, 
  title, 
  message, 
  theme, 
  onClose, 
  confirmText, 
  onConfirm 
}: ThemedAlertProps) {
  const activeTheme = theme || categoryThemes.other;
  const config = getTypeConfig(type, activeTheme.accent);
  
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isRounded = activeTheme.borderRadius >= 20;
  const isTech = activeTheme.name === 'Tech';
  const isSports = activeTheme.name === 'Sports';
  const isArts = activeTheme.name === 'Arts';

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.overlayTouch} 
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.alertContainer,
            {
              backgroundColor: activeTheme.surface,
              borderRadius: activeTheme.borderRadius,
              borderWidth: isSports ? activeTheme.border.width * 2 : activeTheme.border.width,
              borderColor: activeTheme.border.color,
              transform: [{ scale: scaleAnim }],
              shadowColor: activeTheme.shadow.color,
              shadowOpacity: activeTheme.shadow.opacity,
              shadowOffset: { width: activeTheme.shadow.offset.x, height: activeTheme.shadow.offset.y },
              shadowRadius: activeTheme.shadow.radius,
              elevation: 4,
            }
          ]}
        >
          {/* Glow Effect for Tech */}
          {isTech && (
            <View style={[styles.techGlow, { shadowColor: activeTheme.glow.color, shadowOpacity: activeTheme.glow.opacity / 2 }]} />
          )}

          {/* Icon with category-specific styling */}
          <View style={[
            styles.iconWrapper,
            { 
              backgroundColor: config.color + '20',
              borderRadius: isRounded ? 40 : isArts ? 4 : 8,
              borderColor: isTech ? activeTheme.accent : config.color + '40',
              borderWidth: isTech ? 2 : 1,
            }
          ]}>
            <Icon name={config.icon} size={isTech ? 28 : 24} color={config.color} />
          </View>

          {/* Title */}
          <Text style={[
            styles.title, 
            { color: activeTheme.textPrimary }
          ]}>
            {title}
          </Text>

          {/* Message */}
          <Text style={[
            styles.message, 
            { color: activeTheme.textSecondary }
          ]}>
            {message}
          </Text>

          {/* Button */}
          {confirmText ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[
                  styles.cancelBtn,
                  {
                    borderColor: activeTheme.border.color,
                    borderRadius: activeTheme.borderRadius,
                  }
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: activeTheme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: config.color,
                    borderRadius: activeTheme.borderRadius,
                  }
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.singleBtn,
                {
                  backgroundColor: config.color,
                  borderRadius: activeTheme.borderRadius,
                }
              ]}
              onPress={onClose}
            >
              <Text style={styles.confirmText}>OK</Text>
            </TouchableOpacity>
          )}

          {/* Decorative line for Sports */}
          {isSports && (
            <View style={[styles.sportsLine, { backgroundColor: activeTheme.accent }]} />
          )}

          {/* Arts corner decoration */}
          {isArts && (
            <View style={styles.artsCorner}>
              <View style={[styles.artsCornerDot, { backgroundColor: activeTheme.accent }]} />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayTouch: {
    ...StyleSheet.absoluteFill,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 320,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  techGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  singleBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  sportsLine: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
  },
  artsCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  artsCornerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});