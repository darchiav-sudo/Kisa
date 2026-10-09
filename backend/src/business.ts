import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { z } from 'zod';

import {
  CANDIDATES_PER_RESEARCH,
  IdeaModeSchema,
  IdeaSchema,
  IntakeSchema,
  adaptPlan,
  buildKit,
  composeIdea,
  draftLeadReply,
  finalizeKit,
  finalizeTasks,
  type IdeaMode,
  newTaskId,
  researchKey,
  researchMarket,
  stageFor,
  type Intake,
  type Kit,
  type TaskDraft,
} from './ai/business.js';
import { publicBaseUrl, type AppEnv } from './auth.js';
import { businessPayment, leadConversation, telegramBot } from './channels.js';
import { getSql } from './db/client.js';

export function siteUrl(slug: string) {
  return `${publicBaseUrl()}/b/${slug}`;
}

export function fillSiteUrl<T>(value: T, url: string): T {
  return JSON.parse(JSON.stringify(value).replaceAll('{{SITE_URL}}', url)) as T;
}

function makeSlug(raw: string) {
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  return `${base || 'shop'}-${randomBytes(2).toString('hex')}`;
}

export function insertTasksQuery(businessId: string, tasks: TaskDraft[]) {
  const sql = getSql();
  return sql`
    INSERT INTO business_tasks (id, business_id, position, data)
    SELECT t.id, ${businessId}, t.pos, t.data::jsonb
    FROM unnest(${tasks.map(() => newTaskId())}::text[], ${tasks.map((_, i) => i)}::int[],
                ${tasks.map((t) => JSON.stringify(t))}::text[]) AS t(id, pos, data)
  `;
}

const RESEARCH_TTL_HOURS = 24;

/**
 * Research is the slow, expensive step (web search). One pass covers several candidates,
 * so "Another idea" reuses it until those candidates are used up. Shared across users
 * with identical answers.
 */
async function researchNotes(intake: Intake, exclude: string[], mode: IdeaMode) {
  const sql = getSql();
  const generation = Math.floor(exclude.length / CANDIDATES_PER_RESEARCH);
  const key = createHash('sha256').update(`${researchKey(intake, mode)}#${generation}`).digest('hex');
  const hit = await sql`
    SELECT notes FROM research_cache
    WHERE key = ${key} AND created_at > NOW() - make_interval(hours => ${RESEARCH_TTL_HOURS})
  `;
  if (hit[0]) return hit[0].notes as string;

  const notes = await researchMarket(intake, exclude, mode);
  if (notes) {
    await sql.transaction([
      sql`
        INSERT INTO research_cache (key, notes) VALUES (${key}, ${notes})
        ON CONFLICT (key) DO UPDATE SET notes = EXCLUDED.notes, created_at = NOW()
      `,
      sql`DELETE FROM research_cache WHERE created_at < NOW() - make_interval(hours => ${RESEARCH_TTL_HOURS * 2})`,
    ]);
  }
  return notes;
}

export async function moneySummary(businessId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE kind = 'income'), 0) AS earned,
      COALESCE(SUM(amount) FILTER (WHERE kind = 'expense'), 0) AS spent,
      COUNT(*) FILTER (WHERE kind = 'income') AS sales
    FROM business_money WHERE business_id = ${businessId}
  `;
  return {
    earned: Number(rows[0]?.earned ?? 0),
    spent: Number(rows[0]?.spent ?? 0),
    sales: Number(rows[0]?.sales ?? 0),
  };
}

export async function visitSummary(businessId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT
      COALESCE(SUM(views), 0) AS total,
      COALESCE(SUM(views) FILTER (WHERE day > CURRENT_DATE - 7), 0) AS week,
      COALESCE(SUM(views) FILTER (WHERE day = CURRENT_DATE), 0) AS today
    FROM site_visits WHERE business_id = ${businessId}
  `;
  return { total: Number(rows[0]?.total ?? 0), week: Number(rows[0]?.week ?? 0), today: Number(rows[0]?.today ?? 0) };
}

export async function businessView(businessId: string, userId: string) {
  const sql = getSql();
  // All in parallel; ownership is enforced by the businesses query and checked below.
  const [rows, tasks, leads, money, visits, log] = await Promise.all([
    sql`
      SELECT id, slug, status, intake, idea, kit, coach, created_at, payment, auto_reply, telegram_channel
      FROM businesses WHERE id = ${businessId} AND user_id = ${userId}
    `,
    sql`
      SELECT id, data, status, created_at, completed_at FROM business_tasks
      WHERE business_id = ${businessId} AND (status = 'todo' OR (status <> 'replaced' AND completed_at > NOW() - INTERVAL '2 days'))
      ORDER BY created_at DESC, position ASC LIMIT 12
    `,
    sql`
      SELECT id, name, contact, message, status, followup_draft, channel, created_at FROM business_leads
      WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 50
    `,
    moneySummary(businessId),
    visitSummary(businessId),
    sql`
      SELECT id, kind, title, detail, created_at FROM agent_log
      WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 8
    `,
  ]);
  const b = rows[0];
  if (!b) return null;
  const { researchNotes: _notes, ...idea } = b.idea;
  return {
    id: b.id,
    slug: b.slug,
    siteUrl: siteUrl(b.slug),
    status: b.status,
    createdAt: new Date(b.created_at).toISOString(),
    intake: b.intake,
    idea,
    kit: b.kit,
    coach: b.coach,
    stage: stageFor(money.sales),
    money: { ...money, currency: b.idea.currency },
    visits,
    tasks: tasks.map((t) => ({
      id: t.id,
      ...t.data,
      status: t.status,
      createdAt: new Date(t.created_at).toISOString(),
    })),
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      contact: l.contact,
      message: l.message,
      status: l.status,
      followUp: l.followup_draft ?? undefined,
      channel: l.channel,
      createdAt: new Date(l.created_at).toISOString(),
    })),
    connections: {
      telegramBot: telegramBot(),
      telegramChannel: b.telegram_channel ? { title: b.telegram_channel.title, username: b.telegram_channel.username } : null,
      autoReply: b.auto_reply,
      payment: b.payment ?? null,
    },
    agentLog: log.map((e) => ({
      id: String(e.id),
      kind: e.kind,
      title: e.title,
      detail: e.detail ?? undefined,
      createdAt: new Date(e.created_at).toISOString(),
    })),
  };
}

export async function ownedBusiness(businessId: string, userId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT ${sql.unsafe(OWNED_COLUMNS)}
    FROM businesses WHERE id = ${businessId} AND user_id = ${userId}
  `;
  return rows[0] as OwnedBusiness | undefined;
}

export const OWNED_COLUMNS =
  "id, user_id, slug, intake, kit, scouted_at, site_tuned_at, autopilot_at, created_at, test_reported_at, idea->'gap' AS gap";

export type OwnedBusiness = {
  id: string;
  user_id: string;
  slug: string;
  intake: Intake;
  kit: Kit;
  scouted_at: string | null;
  site_tuned_at: string | null;
  autopilot_at: string | null;
  created_at: string;
  test_reported_at: string | null;
  gap: { kind: string; missing: string } | null;
};

export function registerBusinessRoutes(app: Hono<AppEnv>) {
  app.post('/v1/ideas/find', async (c) => {
    const body = z
      .object({
        intake: IntakeSchema,
        exclude: z.array(z.string()).max(10).default([]),
        mode: IdeaModeSchema.default('hands-on'),
      })
      .parse(await c.req.json());
    const started = Date.now();
    const notes = await researchNotes(body.intake, body.exclude, body.mode);
    const idea = await composeIdea(body.intake, body.exclude, notes, body.mode);
    const sql = getSql();
    void sql`INSERT INTO idea_searches (user_id, mode, ms) VALUES (${c.get('userId')}, ${body.mode}, ${Date.now() - started})`.catch(
      () => undefined,
    );
    return c.json({ idea });
  });

  app.post('/v1/businesses', async (c) => {
    const body = z.object({ intake: IntakeSchema, idea: IdeaSchema }).parse(await c.req.json());
    const uid = c.get('userId');
    const kit = await buildKit(body.intake, body.idea);
    const id = `biz_${randomUUID().slice(0, 12)}`;
    const slug = makeSlug(kit.slug || kit.name);
    const filled = await finalizeKit(fillSiteUrl(kit, siteUrl(slug)), siteUrl(slug));

    const sql = getSql();
    await sql.transaction([
      sql`UPDATE businesses SET status = 'archived' WHERE user_id = ${uid} AND status = 'active'`,
      sql`
        INSERT INTO businesses (id, user_id, slug, intake, idea, kit, coach)
        VALUES (${id}, ${uid}, ${slug}, ${JSON.stringify(body.intake)}::jsonb,
                ${JSON.stringify(body.idea)}::jsonb, ${JSON.stringify(filled)}::jsonb,
                ${
                  body.idea.gap
                    ? 'This is a 48-hour test of a real gap. Share the page with today’s 3 tasks — if people tap Order, the demand is real and we go all in.'
                    : 'Your business is set up. Do today’s 3 tasks — that’s all for now. Then tell me what happened.'
                })
      `,
      insertTasksQuery(id, filled.firstTasks),
    ]);
    return c.json({ business: await businessView(id, uid) });
  });

  app.get('/v1/businesses/current', async (c) => {
    const uid = c.get('userId');
    const sql = getSql();
    const rows = await sql`
      SELECT id FROM businesses WHERE user_id = ${uid} AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `;
    if (!rows[0]) return c.json({ business: null });
    // Autopilot only spends AI on businesses whose owner still opens the app.
    void sql`UPDATE businesses SET last_seen_at = NOW() WHERE id = ${rows[0].id}`.catch(() => undefined);
    return c.json({ business: await businessView(rows[0].id, uid) });
  });

  app.get('/v1/businesses', async (c) => {
    const sql = getSql();
    const rows = await sql`
      SELECT b.id, b.status, b.created_at,
        b.kit->>'name' AS name, b.kit->>'emoji' AS emoji, b.kit->>'tagline' AS tagline,
        b.idea->>'currency' AS currency,
        COALESCE(SUM(m.amount) FILTER (WHERE m.kind = 'income'), 0) AS earned,
        COUNT(m.id) FILTER (WHERE m.kind = 'income') AS sales
      FROM businesses b
      LEFT JOIN business_money m ON m.business_id = b.id
      WHERE b.user_id = ${c.get('userId')}
      GROUP BY b.id
      ORDER BY (b.status = 'active') DESC, b.created_at DESC
      LIMIT 50
    `;
    return c.json({
      businesses: rows.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        tagline: r.tagline,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
        earned: Number(r.earned),
        sales: Number(r.sales),
        currency: r.currency === 'GEL' ? 'GEL' : 'USD',
      })),
    });
  });

  app.post('/v1/businesses/:id/activate', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const sql = getSql();
    await sql.transaction([
      sql`UPDATE businesses SET status = 'archived' WHERE user_id = ${uid} AND status = 'active' AND id <> ${biz.id}`,
      sql`UPDATE businesses SET status = 'active' WHERE id = ${biz.id}`,
    ]);
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.get('/v1/ideas/saved', async (c) => {
    const sql = getSql();
    const rows = await sql`
      SELECT id, intake, idea, created_at FROM saved_ideas
      WHERE user_id = ${c.get('userId')} ORDER BY created_at DESC LIMIT 50
    `;
    return c.json({
      ideas: rows.map((r) => ({
        id: r.id,
        intake: r.intake,
        idea: r.idea,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    });
  });

  app.post('/v1/ideas/saved', async (c) => {
    const body = z.object({ intake: IntakeSchema, idea: IdeaSchema }).parse(await c.req.json());
    const id = `idea_${randomUUID().slice(0, 12)}`;
    const sql = getSql();
    await sql`
      INSERT INTO saved_ideas (id, user_id, intake, idea)
      VALUES (${id}, ${c.get('userId')}, ${JSON.stringify(body.intake)}::jsonb, ${JSON.stringify(body.idea)}::jsonb)
    `;
    return c.json({ id });
  });

  app.delete('/v1/ideas/saved/:id', async (c) => {
    const sql = getSql();
    await sql`DELETE FROM saved_ideas WHERE id = ${c.req.param('id')} AND user_id = ${c.get('userId')}`;
    return c.json({ ok: true });
  });

  app.delete('/v1/businesses/:id', async (c) => {
    const sql = getSql();
    await sql`
      UPDATE businesses SET status = 'archived'
      WHERE id = ${c.req.param('id')} AND user_id = ${c.get('userId')}
    `;
    return c.json({ ok: true });
  });

  app.patch('/v1/businesses/:id/tasks/:taskId', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const { status } = z
      .object({ status: z.enum(['todo', 'done', 'skipped']) })
      .parse(await c.req.json());
    const sql = getSql();
    await sql`
      UPDATE business_tasks
      SET status = ${status}, completed_at = ${status === 'todo' ? null : new Date().toISOString()}
      WHERE id = ${c.req.param('taskId')} AND business_id = ${biz.id}
    `;
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.post('/v1/businesses/:id/checkins', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const body = z
      .object({
        events: z.array(z.string().max(100)).max(12),
        earned: z.number().nonnegative().optional(),
        spent: z.number().nonnegative().optional(),
        note: z.string().max(1000).optional(),
      })
      .parse(await c.req.json());

    const sql = getSql();
    const writes = [
      sql`
        INSERT INTO business_checkins (id, business_id, events, note)
        VALUES (${`ci_${randomUUID().slice(0, 12)}`}, ${biz.id}, ${JSON.stringify(body.events)}::jsonb, ${body.note ?? null})
      `,
    ];
    for (const [kind, amount] of [['income', body.earned], ['expense', body.spent]] as const) {
      if (!amount) continue;
      writes.push(sql`
        INSERT INTO business_money (id, business_id, kind, amount, label)
        VALUES (${`m_${randomUUID().slice(0, 12)}`}, ${biz.id}, ${kind}, ${amount}, 'Check-in')
      `);
    }
    await sql.transaction(writes);

    const [money, visits, leads, recentTasks, checkins] = await Promise.all([
      moneySummary(biz.id),
      visitSummary(biz.id),
      sql`SELECT status, message FROM business_leads WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 10`,
      sql`SELECT data->>'title' AS title, status FROM business_tasks WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 12`,
      sql`SELECT events, note, created_at FROM business_checkins WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 8`,
    ]);

    const plan = await adaptPlan({
      intake: biz.intake,
      kit: { ...biz.kit, firstTasks: [] },
      stage: stageFor(money.sales),
      siteUrl: siteUrl(biz.slug),
      money,
      siteVisits: visits,
      leads: leads.map((l) => ({ status: l.status, message: l.message })),
      recentTasks: recentTasks.map((t) => ({ title: t.title, status: t.status })),
      checkins: checkins.map((ci) => ({
        events: ci.events,
        note: ci.note ?? undefined,
        createdAt: new Date(ci.created_at).toISOString(),
      })),
    });

    const tasks = await finalizeTasks(plan.tasks, siteUrl(biz.slug));
    await sql.transaction([
      sql`
        UPDATE business_tasks SET status = 'replaced', completed_at = NOW()
        WHERE business_id = ${biz.id} AND status = 'todo'
      `,
      insertTasksQuery(biz.id, tasks),
      sql`UPDATE businesses SET coach = ${plan.coach} WHERE id = ${biz.id}`,
      sql`
        INSERT INTO agent_log (business_id, kind, title, detail)
        VALUES (${biz.id}, 'plan', ${`Re-planned after your check-in: ${tasks.length} tasks`}, ${tasks.map((t) => `• ${t.title}`).join('\n')})
      `,
    ]);
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.post('/v1/businesses/:id/money', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const body = z
      .object({
        kind: z.enum(['income', 'expense']),
        amount: z.number().positive(),
        label: z.string().max(200).default(''),
      })
      .parse(await c.req.json());
    const sql = getSql();
    await sql`
      INSERT INTO business_money (id, business_id, kind, amount, label)
      VALUES (${`m_${randomUUID().slice(0, 12)}`}, ${biz.id}, ${body.kind}, ${body.amount}, ${body.label})
    `;
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.get('/v1/businesses/:id/money', async (c) => {
    const biz = await ownedBusiness(c.req.param('id'), c.get('userId'));
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const sql = getSql();
    const rows = await sql`
      SELECT id, kind, amount, label, created_at FROM business_money
      WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 100
    `;
    return c.json({
      entries: rows.map((m) => ({
        id: m.id,
        kind: m.kind,
        amount: Number(m.amount),
        label: m.label,
        createdAt: new Date(m.created_at).toISOString(),
      })),
    });
  });

  app.patch('/v1/businesses/:id/money/:entryId', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const body = z
      .object({
        kind: z.enum(['income', 'expense']).optional(),
        amount: z.number().positive().optional(),
        label: z.string().max(200).optional(),
      })
      .parse(await c.req.json());
    const sql = getSql();
    const [row] = await sql`
      UPDATE business_money SET
        kind = COALESCE(${body.kind ?? null}, kind),
        amount = COALESCE(${body.amount ?? null}::numeric, amount),
        label = COALESCE(${body.label ?? null}, label)
      WHERE id = ${c.req.param('entryId')} AND business_id = ${biz.id}
      RETURNING id
    `;
    if (!row) return c.json({ error: 'Entry not found' }, 404);
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.delete('/v1/businesses/:id/money/:entryId', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const sql = getSql();
    const [row] = await sql`
      DELETE FROM business_money WHERE id = ${c.req.param('entryId')} AND business_id = ${biz.id}
      RETURNING id, kind, amount, label, created_at
    `;
    if (!row) return c.json({ error: 'Entry not found' }, 404);
    return c.json({
      business: await businessView(biz.id, uid),
      deleted: { kind: row.kind, amount: Number(row.amount), label: row.label, createdAt: new Date(row.created_at).toISOString() },
    });
  });

  /** Puts a deleted entry back exactly as it was (the app's Undo). */
  app.post('/v1/businesses/:id/money/restore', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const body = z
      .object({
        kind: z.enum(['income', 'expense']),
        amount: z.number().positive(),
        label: z.string().max(200),
        createdAt: z.iso.datetime(),
      })
      .parse(await c.req.json());
    const sql = getSql();
    await sql`
      INSERT INTO business_money (id, business_id, kind, amount, label, created_at)
      VALUES (${`m_${randomUUID().slice(0, 12)}`}, ${biz.id}, ${body.kind}, ${body.amount}, ${body.label}, ${body.createdAt})
    `;
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.patch('/v1/businesses/:id/leads/:leadId', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const { status } = z
      .object({ status: z.enum(['new', 'replied', 'won', 'lost']) })
      .parse(await c.req.json());
    const sql = getSql();
    await sql`
      UPDATE business_leads SET status = ${status}, status_at = NOW()
      WHERE id = ${c.req.param('leadId')} AND business_id = ${biz.id}
    `;
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.post('/v1/businesses/:id/leads/:leadId/draft', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const { fresh } = z
      .object({ fresh: z.boolean().default(false) })
      .parse(await c.req.json().catch(() => ({})));
    const sql = getSql();
    const leadId = c.req.param('leadId');
    const rows = await sql`
      SELECT name, contact, message, reply_draft FROM business_leads
      WHERE id = ${leadId} AND business_id = ${biz.id}
    `;
    if (!rows[0]) return c.json({ error: 'Lead not found' }, 404);
    if (rows[0].reply_draft && !fresh) return c.json({ text: rows[0].reply_draft });
    const [conversation, payment] = await Promise.all([leadConversation(leadId), businessPayment(biz.id)]);
    const text = await draftLeadReply({
      kit: { ...biz.kit, firstTasks: [] },
      siteUrl: siteUrl(biz.slug),
      lead: { name: rows[0].name, contact: rows[0].contact, message: rows[0].message },
      conversation,
      payment,
    });
    await sql`UPDATE business_leads SET reply_draft = ${text} WHERE id = ${leadId} AND business_id = ${biz.id}`;
    return c.json({ text });
  });
}
