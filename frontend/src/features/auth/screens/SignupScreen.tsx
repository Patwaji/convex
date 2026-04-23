import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../../navigation/types';
import { AuthInput } from '../components/AuthInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../../../shared/api/client';
import { triggerGlobalAlert } from '../../../shared/store/globalAlertStore';
import { categoryThemes } from '../../../shared/theme/categoryThemes';

type SignupScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Signup'>;

interface Props {
  navigation: SignupScreenNavigationProp;
}

const THEME = categoryThemes.other;

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      triggerGlobalAlert({
        type: 'warning',
        title: 'ERROR',
        message: 'Please fill in all fields',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/signup', { name, email, password });
      const { user, accessToken, refreshToken } = response.data.data;
      await login(user, accessToken, refreshToken);
    } catch (error: any) {
      triggerGlobalAlert({
        type: 'error',
        title: 'SIGN UP FAILED',
        message: error.response?.data?.error?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: THEME.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: THEME.textPrimary }]}>Join Convex</Text>
          <Text style={[styles.subtitle, { color: THEME.textSecondary }]}>Create an account to start discovering events.</Text>
        </View>

        <View style={styles.form}>
          <AuthInput
            label="Name"
            placeholder="Enter your full name"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            theme={THEME}
          />
          <AuthInput
            label="Email"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            theme={THEME}
          />
          <AuthInput
            label="Password"
            placeholder="Create a strong password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            theme={THEME}
          />
          
          <PrimaryButton 
            title="Create Account" 
            onPress={handleSignup} 
            isLoading={isLoading} 
            style={styles.button}
            theme={THEME}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: THEME.textSecondary }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.link, { color: THEME.accent }]}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -1,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  button: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 15,
    lineHeight: 20,
  },
  link: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
});