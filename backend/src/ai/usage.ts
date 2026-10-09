import { AsyncLocalStorage } from 'node:async_hooks';

import { getSql } from '../db/client.js';

/** Who an AI call is for. Set once per request or background job; every call inside inherits it. */
export type AiContext = { source: string; userId?: string; businessId?: string };

const store = new AsyncLocalStorage<AiContext>();

export function withAiContext<T>(ctx: AiContext, fn: () => Promise<T>): Promise<T> {
  return store.run({ ...store.getStore(), ...ctx }, fn);
}

/** USD per 1M tokens. Override with AI_PRICES='{"model":{"in":..,"cached":..,"out":..}}' when OpenAI changes them. */
const PRICES: Record<string, { in: number; cached: number; out: number }> = {
  'gpt-5.4-mini': { in: 0.75, cached: 0.075, out: 4.5 },
  'gpt-5.4-nano': { in: 0.2, cached: 0.02, out: 1.25 },
  'gpt-5.4': { in: 2.5, cached: 0.25, out: 15 },
  ...(process.env.AI_PRICES ? JSON.parse(process.env.AI_PRICES) : {}),
};
const SEARCH_USD = 0.01;

export type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
};

export function costUsd(model: string, input: number, cached: number, output: number, searches = 0) {
  const p = PRICES[model] ?? PRICES[model.replace(/-\d{4}-\d{2}-\d{2}$/, '')] ?? PRICES['gpt-5.4-mini'];
  return ((input - cached) * p.in + cached * p.cached + output * p.out) / 1e6 + searches * SEARCH_USD;
}

export function recordUsage(entry: {
  task: string;
  model: string;
  startedAt: number;
  usage?: Usage | null;
  searches?: number;
  error?: string;
}) {
  const u = entry.usage ?? {};
  const input = u.input_tokens ?? u.prompt_tokens ?? 0;
  const cached = u.input_tokens_details?.cached_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0;
  const output = u.output_tokens ?? u.completion_tokens ?? 0;
  const reasoning = u.output_tokens_details?.reasoning_tokens ?? u.completion_tokens_details?.reasoning_tokens ?? 0;
  const searches = entry.searches ?? 0;
  const ms = Date.now() - entry.startedAt;
  const cost = costUsd(entry.model, input, cached, output, searches);
  const ctx = store.getStore();

  console.log(
    `[ai] ${entry.task} model=${entry.model} ms=${ms} in=${input} cached=${cached} out=${output} reasoning=${reasoning}` +
      `${searches ? ` searches=${searches}` : ''} $${cost.toFixed(4)} src=${ctx?.source ?? '-'}` +
      `${entry.error ? ` error=${entry.error.slice(0, 120)}` : ''}`,
  );
  if (!process.env.DATABASE_URL) return;
  const sql = getSql();
  void sql`
    INSERT INTO ai_usage (task, model, source, user_id, business_id, input_tokens, cached_tokens, output_tokens,
                          reasoning_tokens, searches, ms, cost_usd, error)
    VALUES (${entry.task}, ${entry.model}, ${ctx?.source ?? null}, ${ctx?.userId ?? null}, ${ctx?.businessId ?? null},
            ${input}, ${cached}, ${output}, ${reasoning}, ${searches}, ${ms}, ${cost}, ${entry.error?.slice(0, 300) ?? null})
  `.catch((e) => console.error('ai_usage insert failed', e.message));
}

export class AiBudgetError extends Error {
  name = 'AiBudgetError';
}

const USER_DAILY_USD = Number(process.env.AI_USER_DAILY_USD || 1);
const DAILY_USD = Number(process.env.AI_DAILY_USD || 10);

/** Today's spend, total or for one user. */
export async function spentToday(userId?: string) {
  const sql = getSql();
  const rows = userId
    ? await sql`SELECT COALESCE(SUM(cost_usd), 0) AS usd FROM ai_usage WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '24 hours'`
    : await sql`SELECT COALESCE(SUM(cost_usd), 0) AS usd FROM ai_usage WHERE created_at > NOW() - INTERVAL '24 hours'`;
  return Number(rows[0]?.usd ?? 0);
}

/**
 * Stops runaway spend before a call: one user looping on a button, or a bug in a background job.
 * Customers (website orders, Telegram messages) are never blocked.
 */
export async function checkBudget() {
  if (!process.env.DATABASE_URL) return;
  const ctx = store.getStore();
  if (ctx?.source === 'site-order' || ctx?.source === 'telegram') return;
  if (ctx?.userId && (await spentToday(ctx.userId)) >= USER_DAILY_USD) {
    throw new AiBudgetError('You’ve used Kisa a lot today. Give it a rest and try again tomorrow.');
  }
  if (ctx?.source.startsWith('autopilot') && (await spentToday()) >= DAILY_USD) {
    throw new AiBudgetError('Daily AI budget reached; autopilot paused until tomorrow.');
  }
}
