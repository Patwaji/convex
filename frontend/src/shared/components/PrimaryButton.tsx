import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  theme?: {
    background?: string;
    surface?: string;
    textPrimary?: string;
    textSecondary?: string;
    accent?: string;
    accentText?: string;
    border?: { color: string; width: number };
  };
}

const defaultTheme = {
  background: '#0A0A0F',
  surface: '#12121A',
  textPrimary: '#E8ECF1',
  textSecondary: '#6B7280',
  accent: '#00F0FF',
  accentText: '#0A0A0F',
  border: { color: '#2D2D3A', width: 1 },
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ title, isLoading, disabled, style, theme = defaultTheme, ...props }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button, 
        { backgroundColor: theme.accent },
        (disabled || isLoading) && { backgroundColor: theme.textSecondary },
        style
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.accentText} />
      ) : (
        <Text style={[styles.text, { color: theme.accentText }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});