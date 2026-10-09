import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'kisa-session-token';

let cached: string | null | undefined;

export async function getSessionToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  cached =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(TOKEN_KEY) ?? null
      : await SecureStore.getItemAsync(TOKEN_KEY);
  return cached;
}

export async function setSessionToken(token: string | null) {
  cached = token;
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}
