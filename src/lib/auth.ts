import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { UserProfile } from '@/src/models/types';
import { ApiError, apiBase, apiFetch } from '@/src/lib/api';
import { setSessionToken } from '@/src/lib/session';

export type SignInResult =
  | { ok: true; user: UserProfile }
  | { ok: false; cancelled: boolean; message?: string };

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

const extra = (Constants.expoConfig?.extra ?? {}) as {
  googleWebClientId?: string;
  googleIosClientId?: string;
};

let nativeGoogle: GoogleSigninModule | null | undefined;

/**
 * The native Google account sheet (same as VS dating) needs a development or store build.
 * Expo Go has no native Google module, so it falls back to the in-app auth sheet.
 */
function getNativeGoogle(): GoogleSigninModule | null {
  if (nativeGoogle !== undefined) return nativeGoogle;
  nativeGoogle = null;
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo || Platform.OS === 'web' || !extra.googleWebClientId) return null;
  if (Platform.OS === 'ios' && !extra.googleIosClientId) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    mod.GoogleSignin.configure({
      webClientId: extra.googleWebClientId,
      iosClientId: extra.googleIosClientId,
    });
    nativeGoogle = mod;
  } catch {
    nativeGoogle = null;
  }
  return nativeGoogle;
}

async function finish(path: string, body: object): Promise<SignInResult> {
  const { token, user } = await apiFetch<{ token: string; user: UserProfile }>(path, {
    method: 'POST',
    json: body,
  });
  await setSessionToken(token);
  return { ok: true, user };
}

async function signInNative(mod: GoogleSigninModule): Promise<SignInResult> {
  const { GoogleSignin, isErrorWithCode, statusCodes } = mod;
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return { ok: false, cancelled: true };
    if (!res.data.idToken) return { ok: false, cancelled: false, message: 'no_id_token' };
    return finish('/auth/google/id-token', { idToken: res.data.idToken });
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
      return { ok: false, cancelled: true };
    }
    throw e;
  }
}

async function signInWithAuthSheet(): Promise<SignInResult> {
  const redirect = Linking.createURL('auth');
  const startUrl = `${apiBase()}/auth/google/start?redirect=${encodeURIComponent(redirect)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirect, {
    showInRecents: false,
    createTask: false,
  });
  if (result.type !== 'success') return { ok: false, cancelled: true };

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) {
    const error = typeof queryParams?.error === 'string' ? queryParams.error : 'unknown_error';
    return { ok: false, cancelled: error === 'access_denied', message: error };
  }
  return exchangeCode(code);
}

const exchanges = new Map<string, Promise<SignInResult>>();

/**
 * The redirect can land in two places at once: the pending auth session and the /auth route
 * (on Android the session sometimes never resolves). Codes are single-use, so share one exchange.
 */
export function exchangeCode(code: string): Promise<SignInResult> {
  let pending = exchanges.get(code);
  if (!pending) {
    pending = exchangeWithRetry(code);
    pending.catch(() => exchanges.delete(code));
    exchanges.set(code, pending);
  }
  return pending;
}

/** Coming back from the browser, mobile networks often fail the first request (DNS not ready yet). */
async function exchangeWithRetry(code: string): Promise<SignInResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await finish('/auth/exchange', { code });
    } catch (e) {
      if (e instanceof ApiError || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const mod = getNativeGoogle();
  return mod ? signInNative(mod) : signInWithAuthSheet();
}

export async function fetchCurrentUser() {
  const { user } = await apiFetch<{ user: UserProfile }>('/v1/me');
  return user;
}

export async function signOutRemote() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
  await getNativeGoogle()?.GoogleSignin.signOut().catch(() => undefined);
  await setSessionToken(null);
}

export async function deleteAccount() {
  await apiFetch('/v1/me', { method: 'DELETE' });
  await getNativeGoogle()?.GoogleSignin.revokeAccess().catch(() => undefined);
  await setSessionToken(null);
}
