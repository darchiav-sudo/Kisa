import Constants from 'expo-constants';

import { getSessionToken } from '@/src/lib/session';

export function apiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (fromEnv || fromExtra || '').replace(/\/$/, '');
}

export function isApiConfigured() {
  return apiBase().length > 0;
}

let onUnauthorized: (() => void) | null = null;

/** Called when the server rejects the session token (expired or revoked). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('API URL not configured');
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 && path.startsWith('/v1/')) onUnauthorized?.();
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error || text;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export async function apiHealth() {
  return apiFetch<{ ok: boolean; service: string; env: string }>('/health');
}
