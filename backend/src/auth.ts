import { createHash, randomBytes } from 'node:crypto';
import type { Context, Hono } from 'hono';
import { z } from 'zod';

import { withAiContext } from './ai/usage.js';
import { getSql } from './db/client.js';

export type AppEnv = { Variables: { userId: string } };

const SESSION_DAYS = 30;
const STATE_TTL_MINUTES = 10;
const CODE_TTL_MINUTES = 5;

/** Where the app is allowed to receive the one-time sign-in code. */
const ALLOWED_REDIRECT_PREFIXES = [
  'kisa://',
  'exp://',
  'exps://',
  'http://localhost:',
  'http://127.0.0.1:',
];

export function publicBaseUrl() {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 47832}`;
}

function googleRedirectUri() {
  return `${publicBaseUrl()}/auth/google/callback`;
}

function token(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function errorPage(message: string) {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:system-ui;background:#080a0e;color:#e8eef5;padding:32px">
<h2>Sign-in failed</h2><p>${message.replace(/</g, '&lt;')}</p><p>Close this window and try again.</p></body>`;
}

function withParam(url: string, key: string, value: string) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
}

/**
 * Android Custom Tabs often silently ignore a server redirect into an app scheme (exp://, kisa://),
 * leaving the user stuck on Google's page. Try a script redirect and keep a tappable button as fallback.
 */
function backToApp(url: string) {
  const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Back to Kisa</title>
<body style="font-family:system-ui;background:#04060c;color:#e8eef5;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center">
<h2 style="margin:0">You're signed in</h2>
<p style="margin:0;color:#8a96a8">Returning to Kisa…</p>
<a href="${safe}" style="background:#fff;color:#111;text-decoration:none;font-weight:800;padding:16px 28px;border-radius:999px">Open Kisa</a>
<script>location.replace(${JSON.stringify(url).replace(/</g, '\\u003c')});</script>
</body>`;
}

export type PublicUser = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

async function loadUser(userId: string): Promise<PublicUser | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, display_name, email, avatar_url, created_at FROM app_users WHERE id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const SESSION_CACHE_MS = 60_000;
const SESSION_CACHE_MAX = 5_000;
const sessionCache = new Map<string, { userId: string; until: number }>();

function forgetUserSessions(userId: string) {
  for (const [hash, entry] of sessionCache) if (entry.userId === userId) sessionCache.delete(hash);
}

export async function userIdFromRequest(c: Context): Promise<string | null> {
  const header = c.req.header('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const hash = sha256(match[1]);
  const cached = sessionCache.get(hash);
  if (cached && cached.until > Date.now()) return cached.userId;

  const sql = getSql();
  const rows = await sql`
    SELECT user_id FROM sessions WHERE token_hash = ${hash} AND expires_at > NOW()
  `;
  const userId: string | null = rows[0]?.user_id ?? null;
  if (userId) {
    if (sessionCache.size >= SESSION_CACHE_MAX) sessionCache.clear();
    sessionCache.set(hash, { userId, until: Date.now() + SESSION_CACHE_MS });
  } else {
    sessionCache.delete(hash);
  }
  return userId;
}

export function registerAuthRoutes(app: Hono<AppEnv>) {
  app.get('/auth/google/start', async (c) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      return c.html(errorPage('Google sign-in is not configured on the server yet.'), 500);
    }
    const redirect = c.req.query('redirect') || '';
    if (!ALLOWED_REDIRECT_PREFIXES.some((p) => redirect.startsWith(p))) {
      return c.html(errorPage('Invalid app redirect.'), 400);
    }

    const sql = getSql();
    const state = token(24);
    await sql.transaction([
      sql`DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '1 hour'`,
      sql`INSERT INTO oauth_states (state, redirect) VALUES (${state}, ${redirect})`,
    ]);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get('/auth/google/callback', async (c) => {
    const sql = getSql();
    const state = c.req.query('state') || '';
    const code = c.req.query('code');

    const issuedCode = async () => {
      const rows = await sql`
        SELECT redirect, app_code FROM oauth_states
        WHERE state = ${state} AND created_at > NOW() - make_interval(mins => ${STATE_TTL_MINUTES})
      `;
      return rows[0] as { redirect: string; app_code: string | null } | undefined;
    };
    const stateRow = await issuedCode();
    if (!stateRow) return c.html(errorPage('Sign-in session expired.'), 400);
    const redirect = stateRow.redirect;
    // Browsers reload this page (tab restore, back button); hand out the same code instead of failing.
    if (stateRow.app_code) return c.html(backToApp(withParam(redirect, 'code', stateRow.app_code)));

    const googleError = c.req.query('error');
    if (googleError || !code) {
      return c.redirect(withParam(redirect, 'error', googleError || 'missing_code'));
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const raced = await issuedCode();
      if (raced?.app_code) return c.html(backToApp(withParam(redirect, 'code', raced.app_code)));
      console.error('Google token exchange failed', await tokenRes.text());
      return c.redirect(withParam(redirect, 'error', 'token_exchange_failed'));
    }
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) return c.redirect(withParam(redirect, 'error', 'userinfo_failed'));
    const info = (await infoRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    const userId = await upsertGoogleUser(info);
    const oneTimeCode = token(24);
    await sql.transaction([
      sql`DELETE FROM auth_codes WHERE created_at < NOW() - INTERVAL '1 hour'`,
      sql`INSERT INTO auth_codes (code, user_id) VALUES (${oneTimeCode}, ${userId})`,
      sql`UPDATE oauth_states SET app_code = ${oneTimeCode} WHERE state = ${state}`,
    ]);
    return c.html(backToApp(withParam(redirect, 'code', oneTimeCode)));
  });

  app.post('/auth/exchange', async (c) => {
    const { code } = z.object({ code: z.string().min(10) }).parse(await c.req.json());
    const sql = getSql();
    const rows = await sql`
      DELETE FROM auth_codes
      WHERE code = ${code} AND created_at > NOW() - make_interval(mins => ${CODE_TTL_MINUTES})
      RETURNING user_id
    `;
    const userId: string | undefined = rows[0]?.user_id;
    if (!userId) return c.json({ error: 'Invalid or expired code' }, 401);
    return c.json({ token: await createSession(userId), user: await loadUser(userId) });
  });

  /** Native Google Sign-In (development/store builds): the app sends Google's ID token directly. */
  app.post('/auth/google/id-token', async (c) => {
    const { idToken } = z.object({ idToken: z.string().min(20) }).parse(await c.req.json());
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) return c.json({ error: 'Invalid Google token' }, 401);
    const info = (await res.json()) as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string;
      name?: string;
      picture?: string;
      exp?: string;
    };
    const audiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean);
    if (!info.sub || !info.aud || !audiences.includes(info.aud)) {
      return c.json({ error: 'Google token was issued for another app' }, 401);
    }
    if (info.exp && Number(info.exp) * 1000 < Date.now()) {
      return c.json({ error: 'Google token expired' }, 401);
    }
    const userId = await upsertGoogleUser({
      sub: info.sub,
      email: info.email_verified === 'false' ? undefined : info.email,
      name: info.name,
      picture: info.picture,
    });
    return c.json({ token: await createSession(userId), user: await loadUser(userId) });
  });

  app.post('/auth/logout', async (c) => {
    const header = c.req.header('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const hash = sha256(match[1]);
      sessionCache.delete(hash);
      const sql = getSql();
      await sql`DELETE FROM sessions WHERE token_hash = ${hash}`;
    }
    return c.json({ ok: true });
  });

  app.use('/v1/*', async (c, next) => {
    const userId = await userIdFromRequest(c);
    if (!userId) return c.json({ error: 'Not signed in' }, 401);
    c.set('userId', userId);
    const businessId = c.req.path.match(/^\/v1\/businesses\/(biz_[\w-]+)/)?.[1];
    const source = `${c.req.method} ${c.req.path.replace(/biz_[\w-]+/, ':id').replace(/\/leads\/[\w-]+/, '/leads/:lead')}`;
    await withAiContext({ source, userId, businessId }, () => next());
  });

  app.get('/v1/me', async (c) => {
    const user = await loadUser(c.get('userId'));
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ user });
  });

  app.delete('/v1/me', async (c) => {
    const sql = getSql();
    await sql`DELETE FROM app_users WHERE id = ${c.get('userId')}`;
    forgetUserSessions(c.get('userId'));
    return c.json({ ok: true });
  });
}

async function upsertGoogleUser(info: { sub: string; email?: string; name?: string; picture?: string }) {
  const sql = getSql();
  const userId = `google_${info.sub}`;
  const displayName = info.name || info.email?.split('@')[0] || 'Kisa user';
  await sql`
    INSERT INTO app_users (id, display_name, email, google_sub, avatar_url)
    VALUES (${userId}, ${displayName}, ${info.email ?? null}, ${info.sub}, ${info.picture ?? null})
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url
  `;
  return userId;
}

async function createSession(userId: string) {
  const sql = getSql();
  const sessionToken = token(32);
  await sql.transaction([
    sql`DELETE FROM sessions WHERE expires_at < NOW()`,
    sql`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES (${sha256(sessionToken)}, ${userId}, NOW() + make_interval(days => ${SESSION_DAYS}))
    `,
  ]);
  return sessionToken;
}
