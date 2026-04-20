import { NativeModules, Platform } from 'react-native';

declare const __DEV__: boolean;

const DEFAULT_API_URL_BY_PLATFORM: Record<string, string> = {
  android: 'http://localhost:5000/api',
  ios: 'http://localhost:5000/api',
};

const RELEASE_API_BASE_URL = 'https://YOUR-VERCEL-BACKEND.vercel.app/api';

function readApiBaseUrl(): string | undefined {
  const processEnv = (globalThis as any)?.process?.env;
  const raw = processEnv?.API_BASE_URL ?? processEnv?.REACT_NATIVE_API_BASE_URL;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveMetroHost(): string | undefined {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL || typeof scriptURL !== 'string') return undefined;

  // Example scriptURL: http://192.168.1.5:8081/index.bundle?platform=android
  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
  if (!match?.[1]) return undefined;

  return match[1];
}

function isProbablyAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;

  const constants = ((Platform as any).constants ?? {}) as {
    Brand?: string;
    Model?: string;
    Fingerprint?: string;
    Manufacturer?: string;
    deviceName?: string;
  };

  const fingerprint = [
    constants.Brand,
    constants.Model,
    constants.Fingerprint,
    constants.Manufacturer,
    constants.deviceName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    fingerprint.includes('generic') ||
    fingerprint.includes('sdk') ||
    fingerprint.includes('emulator') ||
    fingerprint.includes('vbox') ||
    fingerprint.includes('goldfish') ||
    fingerprint.includes('ranchu')
  );
}

function normalizeHostForPlatform(host: string): string {
  if (
    Platform.OS === 'android' &&
    isProbablyAndroidEmulator() &&
    (host === 'localhost' || host === '127.0.0.1')
  ) {
    return '10.0.2.2';
  }

  return host;
}

function getAutoApiBaseUrl(): string | undefined {
  const host = resolveMetroHost();
  if (!host) return undefined;
  return `http://${normalizeHostForPlatform(host)}:5000/api`;
}

export const API_BASE_URL =
  readApiBaseUrl() ??
  (!__DEV__ ? RELEASE_API_BASE_URL : undefined) ??
  getAutoApiBaseUrl() ??
  DEFAULT_API_URL_BY_PLATFORM[Platform.OS] ??
  'http://localhost:5000/api';
