import { z } from 'zod';

import { RULES, intakeText, marketFor, searchLocation, type Intake } from './business.js';
import { composeJson, fastModel, optStr, optUrl, research } from './client.js';
import { brokenLinks } from './links.js';

export const GAP_KINDS = ['unanswered', 'complaints', 'missing', 'language', 'timing', 'import'] as const;

const GapSchema = z.object({
  title: z.string().trim().min(1),
  emoji: z.string().trim().max(8).catch('💡'),
  kind: z.enum(GAP_KINDS).catch('missing'),
  oneLiner: z.string().trim(),
  missing: z.string().trim(),
  evidence: z
    .array(z.object({ title: z.string().trim(), detail: z.string().trim(), source: optStr, url: optUrl }))
    .catch([]),
  demand: z.number().int().min(1).max(5).catch(3),
  competition: z.number().int().min(1).max(5).catch(3),
  firstMoney: z.string().trim(),
  startCost: z.string().trim(),
  speed: z.string().trim(),
});
export type Gap = z.infer<typeof GapSchema>;

const HUNT_RESEARCH = `You are an opportunity hunter for one city. Use web search. Find real, current demand that nobody
serves well — the kind people miss because it is scattered across small posts and reviews. Look for:
1) Unanswered requests: recent posts in local Facebook groups, subreddits, forums, Telegram channels or classifieds
   where people ask "does anyone know / looking for / need someone who…" (search in the local language too) and get
   few or bad answers.
2) Repeated complaints: the same complaint across reviews of local businesses in one category (late, no English,
   no online booking, poor quality, overpriced).
3) Missing services: things normal in similar cities but rare or absent here.
4) Language gaps: services visitors, students or expats need that are only offered in the local language.
5) Timing: events, seasons, new rules or new developments in the next 1–3 months that create demand.
6) Imports: small businesses that work well in other countries and barely exist here.
This pass focuses on ONE angle (below); search it 1–2 times and report what real people say.
Proof means something a real person said or did: a post asking for it, a review complaining, a news story about
people needing it, prices people pay. "I found no service for X" is NOT proof — leave such gaps out.
Only small businesses a beginner can start this week with little money. For each gap write: what exactly is missing,
the proof (short quote or summary, source name, URL, date if shown), what people pay, and who already serves it.
Compact plain-text notes. Never invent anything.`;

const HUNT_SYSTEM = `You are Kisa. From the hunt notes, return the best 4–6 opportunity gaps for this city.
${RULES}
Keep only gaps backed by something real people said or did in the notes (a post, a review, a news report, prices
paid), with its URL when the notes have one. "No service was found" or "only static info exists" is not evidence —
drop those gaps. Fewer strong gaps beat many weak ones. Make the gaps clearly different from each other.
Score honestly: demand 4–5 only when several people independently ask or complain.
kind: unanswered | complaints | missing | language | timing | import.
demand 1–5: how strong and repeated the proof of demand is. competition 1–5: 5 = many already serve it well.
"missing": one plain sentence — what people want and can't get. "oneLiner": what to sell to whom.
Return JSON: { "gaps": [{ "title": "...", "emoji": "one emoji", "kind": "...", "oneLiner": "...", "missing": "...",
  "evidence": [{ "title": "...", "detail": "...", "source": "...", "url": "https://..." }],
  "demand": 1-5, "competition": 1-5, "firstMoney": "e.g. 30–50₾ per job", "startCost": "e.g. 0₾", "speed": "e.g. 2–4 days" }] }`;

/** The model stops after one search when asked for everything at once, so each angle gets its own pass. */
const HUNT_ANGLES = [
  'Angle: the city’s subreddits and forums — "recommend", "looking for", "anyone know", "where can I find" posts.',
  'Angle: the same kind of requests written in the customers’ local language (local Facebook groups, forums, classifieds). If that language is English, search neighborhood groups and Nextdoor-style community boards instead.',
  'Angle: reviews of local businesses in 1–2 everyday categories (repairs, cleaning, tutoring, food, beauty, moving…) where many people complain about the same thing.',
  'Angle: events, seasons, new rules or new developments in the next 1–3 months, and who will need help because of them.',
];

/** One hunt per city, shared by everyone there. */
export async function huntCity(intake: Intake) {
  const market = marketFor(intake);
  const input = JSON.stringify({ location: intake.location, market, today: new Date().toISOString().slice(0, 10) });
  const passes = await Promise.all(
    HUNT_ANGLES.map((angle) =>
      research(`${HUNT_RESEARCH}\n${angle}`, input, {
        task: 'research-gaps',
        location: searchLocation(intake),
        maxSearches: 2,
      }).catch(() => null),
    ),
  );
  const notes = passes.filter(Boolean).join('\n\n---\n\n');
  if (!notes) return null;
  const { gaps } = await composeJson(
    z.object({ gaps: z.array(GapSchema).catch([]) }),
    HUNT_SYSTEM,
    JSON.stringify({ location: intake.location, market, notes }),
    { task: 'gaps' },
  );
  const broken = await brokenLinks(gaps.flatMap((g) => g.evidence.map((e) => e.url)), 4000);
  const clean = gaps
    .map((g) => ({ ...g, evidence: g.evidence.map((e) => (e.url && broken.has(e.url) ? { ...e, url: undefined } : e)) }))
    .filter((g) => g.evidence.length > 0);
  return { gaps: clean, notes };
}

const FitSchema = z.object({
  fits: z.array(z.object({ index: z.number().int(), fit: z.number().int().min(1).max(5).catch(3), whyYou: z.string().trim() })).catch([]),
});

const FIT_SYSTEM = `You match city opportunities to one person. For every gap give fit 1–5 (5 = their skills, assets,
languages, budget and time make it easy for THEM; give a +1 boost, max 5, when it matches what they "love") and "whyYou": one short plain sentence tied to their answers
(or the honest reason it is harder for them). Return JSON: { "fits": [{ "index": 0, "fit": 1-5, "whyYou": "..." }] }`;

export type RankedGap = Gap & { fit: number; whyYou: string; score: number };

/** Cheap personal pass over the shared city hunt. */
export async function rankGaps(intake: Intake, gaps: Gap[]): Promise<RankedGap[]> {
  let fits: z.infer<typeof FitSchema>['fits'] = [];
  try {
    ({ fits } = await composeJson(
      FitSchema,
      FIT_SYSTEM,
      JSON.stringify({
        person: JSON.parse(intakeText(intake)),
        gaps: gaps.map((g, index) => ({ index, title: g.title, oneLiner: g.oneLiner, startCost: g.startCost })),
      }),
      { task: 'gap-fit', model: fastModel() },
    ));
  } catch (e) {
    console.error('gap fit failed', e);
  }
  return gaps
    .map((g, i) => {
      const f = fits.find((x) => x.index === i);
      const fit = f?.fit ?? 3;
      return { ...g, fit, whyYou: f?.whyYou ?? '', score: g.demand * 2 + (6 - g.competition) + fit * 2 };
    })
    .sort((a, b) => b.score - a.score);
}
