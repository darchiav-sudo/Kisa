import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const USER_KEY = 'kisa-user-id';

function apiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (fromEnv || fromExtra || '').replace(/\/$/, '');
}

export function isApiConfigured() {
  return apiBase().length > 0;
}

async function ensureUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(USER_KEY);
  if (existing) return existing;
  const id = `user_${Date.now()}`;
  await AsyncStorage.setItem(USER_KEY, id);
  return id;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('API URL not configured');
  const userId = await ensureUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function apiHealth() {
  return apiFetch<{ ok: boolean; service: string; env: string }>('/health');
}
