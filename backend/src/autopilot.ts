import type { Hono } from 'hono';
import { z } from 'zod';

import { adaptPlan, draftFollowUp, finalizeTasks, scoutMarket, stageFor, tuneWebsite, type Kit } from './ai/business.js';
import { brokenLinks } from './ai/links.js';
import { checkBudget, withAiContext } from './ai/usage.js';
import type { AppEnv } from './auth.js';
import {
  businessView,
  fillSiteUrl,
  insertTasksQuery,
  moneySummary,
  OWNED_COLUMNS,
  ownedBusiness,
  siteUrl,
  visitSummary,
  type OwnedBusiness,
} from './business.js';
import { getSql } from './db/client.js';
import { sendPush } from './push.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const TICK_MS = 30 * 60_000;
const BUSINESSES_PER_TICK = 5;

export async function logAgent(businessId: string, kind: string, title: string, detail?: string) {
  const sql = getSql();
  await sql`
    INSERT INTO agent_log (business_id, kind, title, detail)
    VALUES (${businessId}, ${kind}, ${title.slice(0, 200)}, ${detail?.slice(0, 2000) ?? null})
  `;
}

function olderThan(at: string | null, ms: number) {
  return !at || Date.now() - new Date(at).getTime() > ms;
}

/** Orders left unanswered and customers who went quiet. Cheap, so it runs every tick. */
async function nudgeLeads() {
  const sql = getSql();
  const waiting = await sql`
    UPDATE business_leads l SET nudged_at = NOW()
    FROM businesses b
    WHERE b.id = l.business_id AND b.status = 'active' AND l.status = 'new' AND l.nudged_at IS NULL
      AND l.created_at < NOW() - INTERVAL '2 hours' AND l.created_at > NOW() - INTERVAL '3 days'
    RETURNING l.id, l.name, b.user_id
  `;
  for (const l of waiting) {
    await sendPush(l.user_id, {
      title: `⏰ ${l.name} is still waiting`,
      body: 'Your reply is ready — send it now. Fast replies win the order.',
      data: { url: `/business/lead/${l.id}` },
    });
  }

  const quiet = await sql`
    SELECT l.id, l.name, l.message, l.reply_draft, l.business_id, b.user_id, b.kit
    FROM business_leads l JOIN businesses b ON b.id = l.business_id
    WHERE b.status = 'active' AND l.status = 'replied' AND l.followup_draft IS NULL
      AND COALESCE(l.status_at, l.created_at) < NOW() - INTERVAL '24 hours'
      AND COALESCE(l.status_at, l.created_at) > NOW() - INTERVAL '7 days'
    LIMIT 20
  `;
  for (const l of quiet) {
    try {
      const text = await withAiContext(
        { source: 'autopilot-followup', userId: l.user_id, businessId: l.business_id },
        () =>
          draftFollowUp({
            kit: l.kit as Kit,
            lead: { name: l.name, message: l.message },
            reply: l.reply_draft ?? undefined,
          }),
      );
      await sql`UPDATE business_leads SET followup_draft = ${text} WHERE id = ${l.id}`;
      await logAgent(l.business_id, 'followup', `Wrote a follow-up for ${l.name}`, text);
      await sendPush(l.user_id, {
        title: `💬 Follow up with ${l.name}`,
        body: 'They went quiet. Kisa wrote a friendly nudge — one tap to send.',
        data: { url: `/business/lead/${l.id}` },
      });
    } catch (e) {
      console.error('follow-up failed', l.id, e);
    }
  }
}

/**
 * One autopilot pass for one business: scout the market weekly, rewrite the website when visitors
 * don't order, and plan the day when the owner hasn't checked in. Every action is logged so the
 * owner sees what Kisa did.
 */
export function runAutopilot(biz: OwnedBusiness, opts: { manual?: boolean } = {}) {
  return withAiContext(
    { source: opts.manual ? 'autopilot-manual' : 'autopilot', userId: biz.user_id, businessId: biz.id },
    () => autopilotPass(biz, opts),
  );
}

async function autopilotPass(biz: OwnedBusiness, opts: { manual?: boolean }) {
  const sql = getSql();
  const url = siteUrl(biz.slug);
  const did: string[] = [];
  let kit = biz.kit;

  const [money, visits, leads, recentTasks, checkins] = await Promise.all([
    moneySummary(biz.id),
    visitSummary(biz.id),
    sql`SELECT status, message, created_at FROM business_leads WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 10`,
    sql`SELECT data->>'title' AS title, status, created_at, completed_at FROM business_tasks WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 12`,
    sql`SELECT events, note, created_at FROM business_checkins WHERE business_id = ${biz.id} ORDER BY created_at DESC LIMIT 8`,
  ]);

  if (olderThan(biz.scouted_at, opts.manual ? 3 * DAY : 7 * DAY)) {
    try {
      const scout = await scoutMarket({ intake: biz.intake, kit });
      if (scout) {
        const channels = fillSiteUrl(scout.channels, url);
        const broken = await brokenLinks([...channels.map((c) => c.url), ...scout.competitors.map((c) => c.url)]);
        const fresh = channels.filter(
          (c) => c.url && !broken.has(c.url) && !kit.channels.some((k) => k.url === c.url),
        );
        kit = {
          ...kit,
          channels: [...kit.channels, ...fresh].slice(-8),
          market: {
            summary: scout.summary,
            competitors: scout.competitors.map((c) => (c.url && broken.has(c.url) ? { ...c, url: undefined } : c)),
            checkedAt: new Date().toISOString(),
          },
        };
        await sql`UPDATE businesses SET kit = ${JSON.stringify(kit)}::jsonb, scouted_at = NOW() WHERE id = ${biz.id}`;
        await logAgent(
          biz.id,
          'scout',
          fresh.length
            ? `Found ${fresh.length} new place${fresh.length > 1 ? 's' : ''} to get customers`
            : `Checked ${scout.competitors.length} competitors`,
          [scout.summary, ...fresh.map((c) => `• ${c.name}`)].join('\n'),
        );
        did.push(fresh.length ? `found ${fresh.length} new places to post` : 'checked your competitors');
      }
    } catch (e) {
      console.error('scout failed', biz.id, e);
    }
  }

  /**
   * A new plan only helps if something changed: tasks got done, an order or check-in came in, the site
   * was rewritten, or the open tasks went stale. Otherwise it just swaps tasks the owner hasn't looked at.
   */
  function worthReplanning() {
    const since = (at: unknown) => !!at && !!lastPlanned && new Date(at as string) > new Date(lastPlanned);
    const open = recentTasks.filter((t) => t.status === 'todo');
    return (
      open.length === 0 ||
      olderThan(lastPlanned ?? null, 3 * DAY) ||
      recentTasks.some((t) => since(t.completed_at)) ||
      leads.some((l) => since(l.created_at)) ||
      checkins.some((ci) => since(ci.created_at)) ||
      did.length > 0
    );
  }

  const weekOrders = leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 7 * DAY).length;
  const visitorsDontOrder =
    (visits.total >= (opts.manual ? 5 : 12) && leads.length === 0) || (visits.week >= 25 && weekOrders === 0);
  if (visitorsDontOrder && olderThan(biz.site_tuned_at, opts.manual ? DAY : 4 * DAY)) {
    try {
      const tune = await tuneWebsite({ intake: biz.intake, kit, visits, orders: leads.length });
      const before = kit.website.headline;
      kit = {
        ...kit,
        website: {
          ...kit.website,
          headline: tune.headline,
          subheadline: tune.subheadline,
          bullets: tune.bullets.length ? tune.bullets : kit.website.bullets,
          cta: tune.cta,
        },
        offer: { ...kit.offer, title: tune.offerTitle, description: tune.offerDescription, price: tune.price },
      };
      await sql`UPDATE businesses SET kit = ${JSON.stringify(kit)}::jsonb, site_tuned_at = NOW() WHERE id = ${biz.id}`;
      await logAgent(
        biz.id,
        'site',
        'Rewrote your website to get more orders',
        `${tune.why}\nBefore: “${before}”\nNow: “${tune.headline}”`,
      );
      did.push('rewrote your website');
    } catch (e) {
      console.error('site tune failed', biz.id, e);
    }
  }

  const lastPlanned = recentTasks[0]?.created_at as string | undefined;
  if (opts.manual || (olderThan(lastPlanned ?? null, 20 * HOUR) && worthReplanning())) {
    try {
      const plan = await adaptPlan({
        intake: biz.intake,
        kit: { ...kit, firstTasks: [] },
        stage: stageFor(money.sales),
        siteUrl: url,
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
      const tasks = await finalizeTasks(plan.tasks, url);
      await sql.transaction([
        sql`UPDATE business_tasks SET status = 'replaced', completed_at = NOW() WHERE business_id = ${biz.id} AND status = 'todo'`,
        insertTasksQuery(biz.id, tasks),
        sql`UPDATE businesses SET coach = ${plan.coach} WHERE id = ${biz.id}`,
      ]);
      await logAgent(biz.id, 'plan', `Planned today: ${tasks.length} task${tasks.length > 1 ? 's' : ''}`, tasks.map((t) => `• ${t.title}`).join('\n'));
      did.push('planned today');
    } catch (e) {
      console.error('plan failed', biz.id, e);
    }
  }

  await sql`UPDATE businesses SET autopilot_at = NOW() WHERE id = ${biz.id}`;
  if (did.length && !opts.manual) {
    const list = did.join(', ');
    await sendPush(biz.user_id, {
      title: `🐾 Kisa worked on ${kit.name}`,
      body: `${list.charAt(0).toUpperCase()}${list.slice(1)}. Open to see today’s plan.`,
      data: { url: '/' },
    });
  }
  return did;
}

/** Businesses started from a hunted gap get a verdict after 48 hours: real demand, fix the page, or try the next gap. */
async function reportGapTests() {
  const sql = getSql();
  const done = await sql`
    UPDATE businesses SET test_reported_at = NOW()
    WHERE status = 'active' AND idea ? 'gap' AND test_reported_at IS NULL AND created_at < NOW() - INTERVAL '48 hours'
    RETURNING id, user_id, kit->>'name' AS name
  `;
  for (const b of done) {
    const [r] = await sql`
      SELECT
        (SELECT COALESCE(SUM(views), 0) FROM site_visits WHERE business_id = ${b.id}) AS visits,
        (SELECT COUNT(*) FROM business_leads WHERE business_id = ${b.id}) AS orders
    `;
    const visits = Number(r.visits);
    const orders = Number(r.orders);
    const [title, body] =
      orders > 0
        ? [`Test passed: ${orders} order${orders > 1 ? 's' : ''} in 48h`, 'The demand is real. Kisa keeps pushing this one — reply fast and close the sale.']
        : visits >= 5
          ? [`Test: ${visits} visits, no orders yet`, 'People are interested but the offer isn’t landing. Kisa will sharpen the page and the price.']
          : [`Test: only ${visits} visit${visits === 1 ? '' : 's'}`, 'Not enough people saw it to judge. Share the link in 2–3 more places, or hunt for the next gap.'];
    await logAgent(b.id, 'test', title, body);
    await sendPush(b.user_id, { title: `🧪 ${b.name}: ${title}`, body, data: { url: '/' } });
  }
}

async function tick() {
  try {
    await nudgeLeads();
    await reportGapTests();
    const sql = getSql();
    const due = (await sql`
      UPDATE businesses SET autopilot_at = NOW()
      WHERE id IN (
        SELECT id FROM businesses
        WHERE status = 'active' AND last_seen_at > NOW() - INTERVAL '7 days'
          AND created_at < NOW() - INTERVAL '12 hours'
          AND (autopilot_at IS NULL OR autopilot_at < NOW() - INTERVAL '20 hours')
        ORDER BY autopilot_at NULLS FIRST
        LIMIT ${BUSINESSES_PER_TICK}
      )
      RETURNING ${sql.unsafe(OWNED_COLUMNS)}
    `) as OwnedBusiness[];
    for (const biz of due) {
      await runAutopilot(biz).catch((e) => console.error('autopilot failed', biz.id, e));
    }
    if (due.length) console.log(`[autopilot] ran for ${due.length} business(es)`);
  } catch (e) {
    console.error('autopilot tick failed', e);
  }
}

export function startAutopilot() {
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) return;
  setTimeout(() => void tick(), 60_000);
  setInterval(() => void tick(), TICK_MS);
}

export function registerAutopilotRoutes(app: Hono<AppEnv>) {
  /** "Let Kisa work now": same pass as the nightly one, with lower thresholds. */
  app.post('/v1/businesses/:id/autopilot', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    if (!olderThan(biz.autopilot_at, 10 * 60_000)) {
      return c.json({ error: 'Kisa just worked on this. Try again in a few minutes.' }, 429);
    }
    await checkBudget();
    const did = await runAutopilot(biz, { manual: true });
    return c.json({ did, business: await businessView(biz.id, uid) });
  });

  app.post('/v1/businesses/:id/leads/:leadId/followup', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    z.object({}).parse(await c.req.json().catch(() => ({})));
    const sql = getSql();
    const rows = await sql`
      SELECT name, message, reply_draft FROM business_leads WHERE id = ${c.req.param('leadId')} AND business_id = ${biz.id}
    `;
    if (!rows[0]) return c.json({ error: 'Lead not found' }, 404);
    const text = await draftFollowUp({
      kit: biz.kit,
      lead: { name: rows[0].name, message: rows[0].message },
      reply: rows[0].reply_draft ?? undefined,
    });
    await sql`UPDATE business_leads SET followup_draft = ${text} WHERE id = ${c.req.param('leadId')} AND business_id = ${biz.id}`;
    return c.json({ text });
  });
}
