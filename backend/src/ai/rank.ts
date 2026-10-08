import OpenAI from 'openai';

import {
  businessLaunches,
  moneyLaunches,
  type LaunchSummary,
} from '../data/launches.js';

export type RankProfile =
  | {
      mode: 'money';
      location?: string;
      budgetUsd?: number;
      timeHours?: string;
      hasCar?: boolean;
      channel?: string;
    }
  | {
      mode: 'business';
      product?: string;
      location?: string;
      adBudget?: string;
      hasAudience?: boolean;
      remoteOk?: boolean;
      goal?: string;
    };

function catalog(mode: 'money' | 'business'): LaunchSummary[] {
  return mode === 'money' ? moneyLaunches : businessLaunches;
}

export async function rankLaunches(profile: RankProfile): Promise<{
  launches: LaunchSummary[];
  rationale: string;
  engine: 'openai' | 'catalog';
}> {
  const base = catalog(profile.mode);
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      launches: base,
      rationale: 'OPENAI_API_KEY not set — returning curated catalog order.',
      engine: 'catalog',
    };
  }

  const client = new OpenAI({ apiKey: key });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are Kisa, a first-money coach. Rank the provided launch options for this user.
Rules:
- Never invent demand numbers or guarantee income.
- Prefer no-spend-before-signal / zero-ad paths when budget is tight.
- Return JSON: { "orderedIds": string[], "rationale": string, "primaryId": string }
- orderedIds must be a permutation of the given launch ids only.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          profile,
          launches: base.map((l) => ({
            id: l.id,
            title: l.title,
            summary: l.summary,
            kicker: l.kicker,
            isPrimaryDefault: l.isPrimary,
            rankDefault: l.rank,
          })),
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: { orderedIds?: string[]; rationale?: string; primaryId?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      launches: base,
      rationale: 'Model returned non-JSON — falling back to catalog.',
      engine: 'catalog',
    };
  }

  const byId = new Map(base.map((l) => [l.id, l]));
  const ordered: LaunchSummary[] = [];
  for (const id of parsed.orderedIds ?? []) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  // append any missing
  for (const left of byId.values()) ordered.push(left);

  const primaryId = parsed.primaryId && ordered.some((l) => l.id === parsed.primaryId)
    ? parsed.primaryId
    : ordered[0]?.id;

  const launches = ordered.map((l, i) => ({
    ...l,
    rank: i + 1,
    isPrimary: l.id === primaryId,
  }));

  return {
    launches,
    rationale: parsed.rationale || 'Ranked by Kisa AI for this profile.',
    engine: 'openai',
  };
}
