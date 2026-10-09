import type { Hono } from 'hono';
import { z } from 'zod';

import type { AppEnv } from './auth.js';
import { getSql } from './db/client.js';

type PushMessage = { title: string; body: string; data?: Record<string, string> };

/** Sends to every device of a user via Expo's push service. Never throws: alerts are best-effort. */
export async function sendPush(userId: string, msg: PushMessage) {
  try {
    const sql = getSql();
    const rows = await sql`SELECT token FROM push_tokens WHERE user_id = ${userId}`;
    if (!rows.length) return;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        rows.map((r) => ({ to: r.token, sound: 'default', priority: 'high', channelId: 'default', ...msg })),
      ),
    });
    const json = (await res.json().catch(() => null)) as {
      data?: { status: string; details?: { error?: string } }[];
    } | null;
    const dead = (json?.data ?? [])
      .map((t, i) => (t.details?.error === 'DeviceNotRegistered' ? (rows[i].token as string) : null))
      .filter((t): t is string => !!t);
    if (dead.length) await sql`DELETE FROM push_tokens WHERE token = ANY(${dead}::text[])`;
  } catch (e) {
    console.error('push failed', e);
  }
}

export function registerPushRoutes(app: Hono<AppEnv>) {
  app.post('/v1/push-token', async (c) => {
    const { token, platform } = z
      .object({ token: z.string().min(10).max(300), platform: z.string().max(20).default('') })
      .parse(await c.req.json());
    const sql = getSql();
    await sql`
      INSERT INTO push_tokens (token, user_id, platform) VALUES (${token}, ${c.get('userId')}, ${platform})
      ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()
    `;
    return c.json({ ok: true });
  });

  app.delete('/v1/push-token', async (c) => {
    const { token } = z.object({ token: z.string().min(10).max(300) }).parse(await c.req.json());
    const sql = getSql();
    await sql`DELETE FROM push_tokens WHERE token = ${token} AND user_id = ${c.get('userId')}`;
    return c.json({ ok: true });
  });
}
