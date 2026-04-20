import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../../navigation/types';
import { AuthInput } from '../components/AuthInput';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../../../shared/api/client';
import { triggerGlobalAlert } from '../../../shared/store/globalAlertStore';
import { categoryThemes } from '../../../shared/theme/categoryThemes';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const THEME = categoryThemes.other;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      triggerGlobalAlert({
        type: 'warning',
        title: 'ERROR',
        message: 'Please fill in all fields',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data.data;
      await login(user, accessToken, refreshToken);
    } catch (error: any) {
      const apiMessage = error?.response?.data?.error?.message;
      const fallbackMessage = error?.message ? `Network/Client error: ${error.message}` : 'Something went wrong. Please try again.';
      console.log('Login error debug:', {
        baseURL: (apiClient.defaults as any)?.baseURL,
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      triggerGlobalAlert({
        type: 'error',
        title: 'LOGIN FAILED',
        message: apiMessage || fallbackMessage,
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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: THEME.textPrimary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: THEME.textSecondary }]}>Discover the best events around you.</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            theme={THEME}
          />
          
          <PrimaryButton 
            title="Log In" 
            onPress={handleLogin} 
            isLoading={isLoading} 
            style={styles.button}
            theme={THEME}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: THEME.textSecondary }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.link, { color: THEME.accent }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  },
  footerText: {
    fontSize: 15,
  },
  link: {
    fontWeight: '700',
    fontSize: 15,
  },
});