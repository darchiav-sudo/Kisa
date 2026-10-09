import { createHash } from 'node:crypto';
import type { Hono } from 'hono';
import { z } from 'zod';

import { IntakeSchema, composeIdea, marketFor, type Intake } from './ai/business.js';
import { GAP_KINDS, huntCity, rankGaps, type Gap } from './ai/gaps.js';
import type { AppEnv } from './auth.js';
import { getSql } from './db/client.js';

const HUNT_TTL_DAYS = 7;

export function huntKey(intake: Intake) {
  const m = marketFor(intake);
  return createHash('sha256').update(`v1|${m.country}|${m.city.toLowerCase()}|${m.customerLanguage}`).digest('hex');
}

const GapInput = z.object({
  title: z.string().max(200),
  emoji: z.string().max(8).optional(),
  kind: z.enum(GAP_KINDS),
  oneLiner: z.string().max(500),
  missing: z.string().max(500),
  evidence: z
    .array(z.object({ title: z.string(), detail: z.string(), source: z.string().optional(), url: z.string().optional() }))
    .max(10),
  firstMoney: z.string().max(200),
  startCost: z.string().max(200),
  speed: z.string().max(200),
});

export function registerGapRoutes(app: Hono<AppEnv>) {
  /** Hidden opportunities in the user's city, ranked for them. */
  app.post('/v1/gaps', async (c) => {
    const body = z.object({ intake: IntakeSchema, refresh: z.boolean().default(false) }).parse(await c.req.json());
    const sql = getSql();
    const key = huntKey(body.intake);
    const [cached] = await sql`
      SELECT gaps, created_at FROM gap_hunts
      WHERE key = ${key} AND created_at > NOW() - make_interval(days => ${HUNT_TTL_DAYS})
    `;
    // A fresh hunt is allowed at most once a day per city; otherwise everyone shares the cached one.
    const fresh = body.refresh && cached && Date.now() - new Date(cached.created_at).getTime() > 86_400_000;
    let gaps = cached?.gaps as Gap[] | undefined;
    let huntedAt = cached?.created_at as string | undefined;
    if (!gaps || fresh) {
      const hunt = await huntCity(body.intake);
      if (!hunt || hunt.gaps.length === 0) {
        if (gaps) return c.json({ gaps: await rankGaps(body.intake, gaps), huntedAt });
        return c.json({ error: 'Kisa couldn’t find solid proof of a gap this time. Try again later.' }, 502);
      }
      gaps = hunt.gaps;
      huntedAt = new Date().toISOString();
      await sql`
        INSERT INTO gap_hunts (key, location, gaps, notes) VALUES (${key}, ${body.intake.location}, ${JSON.stringify(gaps)}::jsonb, ${hunt.notes})
        ON CONFLICT (key) DO UPDATE SET gaps = EXCLUDED.gaps, notes = EXCLUDED.notes, location = EXCLUDED.location, created_at = NOW()
      `;
    }
    return c.json({ gaps: await rankGaps(body.intake, gaps), huntedAt });
  });

  /** Turns a chosen gap into a full idea, ready for the normal "Start this business" flow. */
  app.post('/v1/gaps/idea', async (c) => {
    const body = z.object({ intake: IntakeSchema, gap: GapInput }).parse(await c.req.json());
    const sql = getSql();
    const [hunt] = await sql`SELECT notes FROM gap_hunts WHERE key = ${huntKey(body.intake)}`;
    const idea = await composeIdea(
      body.intake,
      [],
      (hunt?.notes as string | undefined) ?? null,
      'hands-on',
      JSON.stringify(body.gap),
    );
    return c.json({ idea: { ...idea, gap: { kind: body.gap.kind, missing: body.gap.missing } } });
  });
}
