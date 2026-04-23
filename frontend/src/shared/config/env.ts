import { NativeModules, Platform } from 'react-native';

declare const __DEV__: boolean;

const DEFAULT_API_URL_BY_PLATFORM: Record<string, string> = {
  android: 'http://10.0.2.2:5000/api',  // For emulator
  ios: 'http://localhost:5000/api',
};

// For physical Android device testing, use your computer's local IP
// Change this to your computer's IP address (e.g., 192.168.1.100)
const PHYSICAL_DEVICE_IP = 'http://192.168.0.106:5000/api';

const RELEASE_API_BASE_URL = 'https://convex-rouge.vercel.app/api';

function readApiBaseUrl(): string | undefined {
  // Keep direct process.env access so Babel can inline values at build time.
  const inlineValue =
    (typeof process !== 'undefined' ? process.env?.REACT_NATIVE_API_BASE_URL : undefined) ??
    (typeof process !== 'undefined' ? process.env?.API_BASE_URL : undefined);

  const runtimeValue =
    (globalThis as any)?.process?.env?.REACT_NATIVE_API_BASE_URL ??
    (globalThis as any)?.process?.env?.API_BASE_URL;

  const raw = inlineValue ?? runtimeValue;
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

function normalizeHostForPlatform(host: string): string | undefined {
  if (
    Platform.OS === 'android' &&
    (host === 'localhost' || host === '127.0.0.1')
  ) {
    if (isProbablyAndroidEmulator()) {
      return '10.0.2.2';
    }

    // On a physical Android device, localhost points to the phone itself.
    // Return undefined so we can fall back to a reachable URL (release or env override).
    return undefined;
  }

  return host;
}

function getAutoApiBaseUrl(): string | undefined {
  const host = resolveMetroHost();
  if (!host) return undefined;

  const normalizedHost = normalizeHostForPlatform(host);
  if (!normalizedHost) return undefined;

  return `http://${normalizedHost}:5000/api`;
}

export const API_BASE_URL =
  __DEV__ 
    ? PHYSICAL_DEVICE_IP // Use local IP for physical device testing
    : readApiBaseUrl() ?? RELEASE_API_BASE_URL ?? DEFAULT_API_URL_BY_PLATFORM[Platform.OS] ?? 'http://localhost:5000/api';
