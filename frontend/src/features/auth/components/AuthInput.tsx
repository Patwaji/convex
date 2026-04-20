import React from 'react';
import { TextInput, TextInputProps, View, Text, StyleSheet } from 'react-native';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  theme?: {
    background?: string;
    surface?: string;
    textPrimary?: string;
    textSecondary?: string;
    accent?: string;
    border?: { color: string; width: number };
  };
}

const defaultTheme = {
  background: '#0A0A0F',
  surface: '#12121A',
  textPrimary: '#E8ECF1',
  textSecondary: '#6B7280',
  accent: '#00F0FF',
  border: { color: '#2D2D3A', width: 1 },
};

export const AuthInput: React.FC<AuthInputProps> = ({ label, error, theme = defaultTheme, ...props }) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          { 
            backgroundColor: theme.surface, 
            color: theme.textPrimary,
            borderColor: error ? '#EF4444' : (theme.border?.color ?? defaultTheme.border.color)
          },
          error && { backgroundColor: theme.background + '40' }
        ]}
        placeholderTextColor={theme.textSecondary}
        {...props}
      />
      {error ? <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});