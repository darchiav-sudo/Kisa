/**
 * Prints the path to first money: how many users reach each step, and how long it takes.
 * Run: railway run --service api --environment development npx tsx scripts/funnel.ts [days]
 */
import { neon } from '@neondatabase/serverless';

const days = Number(process.argv[2] ?? 30);
const sql = neon(process.env.DATABASE_URL!);

const [row] = await sql`
  WITH u AS (SELECT id FROM app_users WHERE created_at > NOW() - make_interval(days => ${days})),
  b AS (SELECT id, user_id, created_at FROM businesses WHERE user_id IN (SELECT id FROM u)),
  first_sale AS (
    SELECT b.user_id, MIN(m.created_at) - MIN(b.created_at) AS took
    FROM b JOIN business_money m ON m.business_id = b.id AND m.kind = 'income'
    GROUP BY b.user_id
  )
  SELECT
    (SELECT COUNT(*) FROM u) AS signed_up,
    (SELECT COUNT(DISTINCT user_id) FROM idea_searches WHERE user_id IN (SELECT id FROM u)) AS searched,
    (SELECT COUNT(DISTINCT user_id) FROM b) AS started,
    (SELECT COUNT(DISTINCT b.user_id) FROM b JOIN business_tasks t ON t.business_id = b.id AND t.status = 'done') AS did_task,
    (SELECT COUNT(DISTINCT b.user_id) FROM b JOIN site_visits v ON v.business_id = b.id) AS got_visit,
    (SELECT COUNT(DISTINCT b.user_id) FROM b JOIN business_leads l ON l.business_id = b.id) AS got_order,
    (SELECT COUNT(*) FROM first_sale) AS got_paid,
    (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM took) / 3600) FROM first_sale) AS median_hours,
    (SELECT ROUND(AVG(ms) / 1000.0, 1) FROM idea_searches WHERE created_at > NOW() - make_interval(days => ${days})) AS avg_search_s
`;

const steps: [string, number][] = [
  ['Signed up', Number(row.signed_up)],
  ['Searched for an idea', Number(row.searched)],
  ['Started a business', Number(row.started)],
  ['Finished a task', Number(row.did_task)],
  ['Website got a visit', Number(row.got_visit)],
  ['Got an order', Number(row.got_order)],
  ['Got paid', Number(row.got_paid)],
];

console.log(`\nKisa — last ${days} days\n`);
const top = steps[0][1] || 1;
for (const [label, n] of steps) {
  const pct = Math.round((n / top) * 100);
  console.log(`${label.padEnd(22)} ${String(n).padStart(5)}  ${String(pct).padStart(3)}%  ${'█'.repeat(Math.round(pct / 4))}`);
}
console.log(
  `\nMedian time to first money: ${row.median_hours == null ? '—' : `${Number(row.median_hours).toFixed(1)} h`}`,
);
console.log(`Average idea search: ${row.avg_search_s ?? '—'} s\n`);
