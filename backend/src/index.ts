import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { businessLaunches, moneyLaunches } from './data/launches.js';
import { getSql } from './db/client.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = new Hono();
const port = Number(process.env.PORT || 47832);

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  }),
);

function userId(c: { req: { header: (n: string) => string | undefined } }) {
  return c.req.header('X-User-Id') || 'demo-user';
}

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'kisa-api',
    env: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'local',
    time: new Date().toISOString(),
  }),
);

app.post('/v1/migrate', async (c) => {
  const sql = getSql();
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schema = readFileSync(join(__dirname, 'db/schema.sql'), 'utf8');
  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
  for (const statement of statements) {
    await sql.query(statement);
  }
  return c.json({ ok: true, statements: statements.length });
});

app.post('/v1/users/ensure', async (c) => {
  const sql = getSql();
  const body = z
    .object({
      id: z.string().optional(),
      displayName: z.string().optional(),
    })
    .parse(await c.req.json().catch(() => ({})));

  const id = body.id || userId(c) || randomUUID();
  const displayName = body.displayName || 'Operator';
  await sql`
    INSERT INTO app_users (id, display_name)
    VALUES (${id}, ${displayName})
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
  `;
  return c.json({ id, displayName, createdAt: new Date().toISOString() });
});

app.put('/v1/profiles/money', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const profile = z
    .object({
      location: z.string(),
      budgetUsd: z.number(),
      timeHours: z.string(),
      hasCar: z.boolean(),
      channel: z.enum(['online', 'offline', 'either']),
    })
    .parse(await c.req.json());

  await sql`INSERT INTO app_users (id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
  await sql`
    INSERT INTO money_profiles (user_id, location, budget_usd, time_hours, has_car, channel, updated_at)
    VALUES (${uid}, ${profile.location}, ${profile.budgetUsd}, ${profile.timeHours}, ${profile.hasCar}, ${profile.channel}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      location = EXCLUDED.location,
      budget_usd = EXCLUDED.budget_usd,
      time_hours = EXCLUDED.time_hours,
      has_car = EXCLUDED.has_car,
      channel = EXCLUDED.channel,
      updated_at = NOW()
  `;
  return c.json({ ok: true, profile });
});

app.put('/v1/profiles/business', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const profile = z
    .object({
      product: z.string(),
      location: z.string(),
      adBudget: z.string(),
      hasAudience: z.boolean(),
      remoteOk: z.boolean(),
      goal: z.string(),
    })
    .parse(await c.req.json());

  await sql`INSERT INTO app_users (id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
  await sql`
    INSERT INTO business_profiles (user_id, product, location, ad_budget, has_audience, remote_ok, goal, updated_at)
    VALUES (${uid}, ${profile.product}, ${profile.location}, ${profile.adBudget}, ${profile.hasAudience}, ${profile.remoteOk}, ${profile.goal}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      product = EXCLUDED.product,
      location = EXCLUDED.location,
      ad_budget = EXCLUDED.ad_budget,
      has_audience = EXCLUDED.has_audience,
      remote_ok = EXCLUDED.remote_ok,
      goal = EXCLUDED.goal,
      updated_at = NOW()
  `;
  return c.json({ ok: true, profile });
});

app.post('/v1/launches/rank', async (c) => {
  const body = z
    .object({ mode: z.enum(['money', 'business']) })
    .parse(await c.req.json());
  const launches = body.mode === 'money' ? moneyLaunches : businessLaunches;
  return c.json({
    mode: body.mode,
    launches,
    generatedAt: new Date().toISOString(),
    note: 'Ranked locally from catalog. Demand numbers are not invented.',
  });
});

app.post('/v1/distribution/publish', async (c) => {
  const body = z
    .object({
      launchId: z.string(),
      channels: z.array(z.string()).default(['demo']),
    })
    .parse(await c.req.json());
  // Mock agent publish — records analytics, does not hit real networks.
  const sql = getSql();
  const uid = userId(c);
  await sql`
    INSERT INTO analytics_events (user_id, event, props)
    VALUES (${uid}, ${'simulate_publish'}, ${JSON.stringify(body)}::jsonb)
  `;
  return c.json({
    publishedAt: new Date().toISOString(),
    launchId: body.launchId,
    channels: body.channels,
    simulated: true,
  });
});

app.post('/v1/leads/simulate', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const body = z.object({ launchId: z.string() }).parse(await c.req.json());
  const isBooks = body.launchId.includes('books') || body.launchId.includes('drop');
  const lead = {
    id: `lead_${randomUUID()}`,
    launchId: body.launchId,
    name: isBooks ? 'Nino' : 'Maya',
    message: isBooks
      ? 'წიგნი'
      : 'Hi — leaves covering our sidewalk and small front yard. Can you do the $49 job this week?',
    zip: isBooks ? undefined : '19111',
    createdAt: new Date().toISOString(),
  };
  await sql`INSERT INTO app_users (id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
  await sql`
    INSERT INTO leads (id, user_id, launch_id, name, message, zip, created_at)
    VALUES (${lead.id}, ${uid}, ${lead.launchId}, ${lead.name}, ${lead.message}, ${lead.zip ?? null}, ${lead.createdAt})
  `;
  return c.json(lead);
});

app.get('/v1/progress', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const rows = await sql`
    SELECT launch_id, current_step_index, completed_step_ids, status,
           simulated_published, lead_id, booked, started_at, updated_at
    FROM launch_progress WHERE user_id = ${uid}
  `;
  return c.json({ progress: rows });
});

app.put('/v1/progress/:launchId', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const launchId = c.req.param('launchId');
  const body = z
    .object({
      currentStepIndex: z.number().int().nonnegative(),
      completedStepIds: z.array(z.string()),
      status: z.enum(['active', 'completed', 'abandoned']).default('active'),
      simulatedPublished: z.boolean().optional(),
      leadId: z.string().optional(),
      booked: z.boolean().optional(),
    })
    .parse(await c.req.json());

  const id = `${uid}:${launchId}`;
  await sql`INSERT INTO app_users (id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
  await sql`
    INSERT INTO launch_progress (
      id, user_id, launch_id, current_step_index, completed_step_ids, status,
      simulated_published, lead_id, booked, started_at, updated_at
    ) VALUES (
      ${id}, ${uid}, ${launchId}, ${body.currentStepIndex},
      ${JSON.stringify(body.completedStepIds)}::jsonb, ${body.status},
      ${body.simulatedPublished ?? false}, ${body.leadId ?? null}, ${body.booked ?? false},
      NOW(), NOW()
    )
    ON CONFLICT (user_id, launch_id) DO UPDATE SET
      current_step_index = EXCLUDED.current_step_index,
      completed_step_ids = EXCLUDED.completed_step_ids,
      status = EXCLUDED.status,
      simulated_published = COALESCE(EXCLUDED.simulated_published, launch_progress.simulated_published),
      lead_id = COALESCE(EXCLUDED.lead_id, launch_progress.lead_id),
      booked = COALESCE(EXCLUDED.booked, launch_progress.booked),
      updated_at = NOW()
  `;
  return c.json({ ok: true });
});

app.get('/v1/earnings', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const rows = await sql`
    SELECT id, launch_id, amount, currency, label, created_at
    FROM earnings WHERE user_id = ${uid} ORDER BY created_at DESC
  `;
  return c.json({ earnings: rows });
});

app.post('/v1/earnings', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const body = z
    .object({
      launchId: z.string(),
      amount: z.number(),
      currency: z.enum(['USD', 'GEL']),
      label: z.string(),
    })
    .parse(await c.req.json());
  const id = `earn_${randomUUID()}`;
  await sql`INSERT INTO app_users (id) VALUES (${uid}) ON CONFLICT DO NOTHING`;
  await sql`
    INSERT INTO earnings (id, user_id, launch_id, amount, currency, label)
    VALUES (${id}, ${uid}, ${body.launchId}, ${body.amount}, ${body.currency}, ${body.label})
  `;
  return c.json({ id, ...body, at: new Date().toISOString() });
});

app.post('/v1/analytics', async (c) => {
  const sql = getSql();
  const uid = userId(c);
  const body = z
    .object({
      event: z.string(),
      props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    })
    .parse(await c.req.json());
  await sql`
    INSERT INTO analytics_events (user_id, event, props)
    VALUES (${uid}, ${body.event}, ${JSON.stringify(body.props ?? {})}::jsonb)
  `;
  return c.json({ ok: true });
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Server error' }, 500);
});

async function boot() {
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL missing — /health works, data routes will fail');
  } else {
    try {
      const sql = getSql();
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const schema = readFileSync(join(__dirname, 'db/schema.sql'), 'utf8');
      const statements = schema
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
      for (const statement of statements) {
        await sql.query(statement);
      }
      console.log(`Migrated ${statements.length} statements`);
    } catch (e) {
      console.error('Auto-migrate failed', e);
    }
  }

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Kisa API listening on :${info.port}`);
  });
}

boot();
