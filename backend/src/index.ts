import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerAuthRoutes, type AppEnv } from './auth.js';
import { registerAutopilotRoutes, startAutopilot } from './autopilot.js';
import { registerBusinessRoutes } from './business.js';
import { registerChannelRoutes, startTelegram } from './channels.js';
import { getSql } from './db/client.js';
import { registerGapRoutes } from './gaps.js';
import { registerPushRoutes } from './push.js';
import { registerSiteRoutes } from './site.js';

const app = new Hono<AppEnv>();
const port = Number(process.env.PORT || 47832);

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use('*', compress());

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'kisa-api',
    env: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'local',
    openai: Boolean(process.env.OPENAI_API_KEY),
    googleAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    time: new Date().toISOString(),
  }),
);

registerSiteRoutes(app);
registerAuthRoutes(app);
registerBusinessRoutes(app);
registerAutopilotRoutes(app);
registerGapRoutes(app);
registerChannelRoutes(app);
registerPushRoutes(app);

app.onError((err, c) => {
  console.error(err);
  if (err.name === 'ZodError') return c.json({ error: 'Invalid request' }, 400);
  if (err.name === 'AiBudgetError') return c.json({ error: err.message }, 429);
  return c.json({ error: err.message || 'Server error' }, 500);
});

async function migrate() {
  const sql = getSql();
  const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'db/schema.sql'), 'utf8');
  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
  // One HTTP round trip instead of one per statement.
  await sql.transaction(statements.map((s) => sql.query(s)));
  console.log(`Migrated ${statements.length} statements`);
}

async function boot() {
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL missing — /health works, data routes will fail');
  } else {
    await migrate().catch((e) => console.error('Auto-migrate failed', e));
  }
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Kisa API listening on :${info.port}`);
  });
  startAutopilot();
  void startTelegram();
}

boot();
