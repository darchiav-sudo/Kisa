/**
 * Where the OpenAI money goes: by task, by trigger, by day, by user, and what one idea / business / autopilot day costs.
 * Run: railway run --service api --environment development npx tsx scripts/ai-usage.ts [days]
 */
import { neon } from '@neondatabase/serverless';

const days = Number(process.argv[2] ?? 7);
const db = neon(process.env.DATABASE_URL!);
const SINCE = `created_at > NOW() - make_interval(days => $1)`;
const q = (text: string) => db.query(text.replaceAll('{since}', SINCE), [days]) as Promise<Record<string, unknown>[]>;

const usd = (v: unknown) => `$${Number(v ?? 0).toFixed(Number(v ?? 0) < 1 ? 4 : 2)}`;
const k = (v: unknown) => (Number(v ?? 0) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(Number(v ?? 0)));
const pct = (a: unknown, b: unknown) => (Number(b) ? `${Math.round((Number(a) / Number(b)) * 100)}%` : '—');

function table(title: string, rows: Record<string, unknown>[]) {
  console.log(`\n${title}`);
  if (!rows.length) return console.log('  (nothing yet)');
  const cols = Object.keys(rows[0]);
  const cells = rows.map((r) => cols.map((c) => String(r[c] ?? '')));
  const width = cols.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)));
  console.log('  ' + cols.map((c, i) => c.padEnd(width[i])).join('  '));
  for (const r of cells) console.log('  ' + r.map((v, i) => (i ? v.padStart(width[i]) : v.padEnd(width[i]))).join('  '));
}

const [total] = await q(`
  SELECT COUNT(*) AS calls, SUM(cost_usd) AS usd, SUM(input_tokens) AS input, SUM(cached_tokens) AS cached,
         SUM(output_tokens) AS output, SUM(searches) AS searches, COUNT(*) FILTER (WHERE error IS NOT NULL) AS errors
  FROM ai_usage WHERE {since}
`);
console.log(`\nKisa AI spend — last ${days} days`);
console.log(
  `  ${usd(total.usd)} over ${total.calls} calls · ${k(total.input)} tokens in (${pct(total.cached, total.input)} cached) · ` +
    `${k(total.output)} out · ${total.searches ?? 0} web searches (${usd(Number(total.searches ?? 0) * 0.01)}) · ${total.errors} errors`,
);

const byTask = await q(`
  SELECT task, COUNT(*) AS calls, ROUND(AVG(input_tokens)) AS avg_in, ROUND(AVG(output_tokens)) AS avg_out,
         ROUND(AVG(searches), 1) AS avg_searches, ROUND(AVG(ms)) AS avg_ms, SUM(cost_usd) AS usd, AVG(cost_usd) AS per_call
  FROM ai_usage WHERE {since} GROUP BY task ORDER BY usd DESC
`);
table(
  'By task',
  byTask.map((r) => ({
    task: r.task,
    calls: r.calls,
    'avg in': k(r.avg_in),
    'avg out': k(r.avg_out),
    searches: r.avg_searches,
    'avg sec': (Number(r.avg_ms) / 1000).toFixed(1),
    'per call': usd(r.per_call),
    total: usd(r.usd),
    share: pct(r.usd, total.usd),
  })),
);

const bySource = await q(`
  SELECT COALESCE(source, '-') AS source, COUNT(*) AS calls, SUM(cost_usd) AS usd
  FROM ai_usage WHERE {since} GROUP BY 1 ORDER BY usd DESC
`);
table('By trigger', bySource.map((r) => ({ trigger: r.source, calls: r.calls, total: usd(r.usd), share: pct(r.usd, total.usd) })));

const byDay = await q(`
  SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS calls, SUM(searches) AS searches, SUM(cost_usd) AS usd
  FROM ai_usage WHERE {since} GROUP BY 1 ORDER BY 1 DESC
`);
table('By day', byDay.map((r) => ({ day: r.day, calls: r.calls, searches: r.searches, total: usd(r.usd) })));

const byUser = await q(`
  SELECT COALESCE(a.user_id, '(none)') AS user_id, u.display_name, COUNT(*) AS calls, SUM(a.cost_usd) AS usd
  FROM ai_usage a LEFT JOIN app_users u ON u.id = a.user_id
  WHERE a.{since} GROUP BY 1, 2 ORDER BY usd DESC LIMIT 10
`);
table('Top users', byUser.map((r) => ({ user: `${r.display_name ?? ''} ${r.user_id}`.trim(), calls: r.calls, total: usd(r.usd) })));

const [unit] = await q(`
  SELECT
    (SELECT COUNT(*) FROM idea_searches WHERE {since}) AS ideas,
    (SELECT SUM(cost_usd) FROM ai_usage WHERE {since} AND (task LIKE 'research-idea%' OR task LIKE 'research-hands%' OR task LIKE 'idea%')) AS idea_usd,
    (SELECT COUNT(*) FROM ai_usage WHERE {since} AND task = 'kit') AS kits,
    (SELECT SUM(cost_usd) FROM ai_usage WHERE {since} AND task LIKE 'kit%') AS kit_usd,
    (SELECT COUNT(DISTINCT (business_id, created_at::date)) FROM ai_usage WHERE {since} AND source LIKE 'autopilot%') AS biz_days,
    (SELECT SUM(cost_usd) FROM ai_usage WHERE {since} AND source LIKE 'autopilot%') AS autopilot_usd
`);
const per = (a: unknown, n: unknown) => (Number(n) ? usd(Number(a ?? 0) / Number(n)) : '—');
console.log('\nUnit costs');
console.log(`  one idea shown:         ${per(unit.idea_usd, unit.ideas)}  (${unit.ideas} ideas)`);
console.log(`  one business created:   ${per(unit.kit_usd, unit.kits)}  (${unit.kits} kits)`);
console.log(`  autopilot per biz/day:  ${per(unit.autopilot_usd, unit.biz_days)}`);
console.log('');
