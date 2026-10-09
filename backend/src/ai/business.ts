import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import {
  composeJson,
  composeText,
  fastModel,
  optStr,
  optUrl,
  research,
  strList,
  type SearchLocation,
} from './client.js';
import { SHARE_TARGETS, brokenLinks, mapsLink, shareLabel, shareLink } from './links.js';

export const IntakeSchema = z.object({
  start: z.enum(['new', 'existing']),
  product: z.string().trim().max(300).optional(),
  location: z.string().trim().min(1).max(200),
  coords: z.object({ lat: z.number(), lng: z.number() }).optional(),
  area: z
    .object({
      countryCode: z.string().trim().length(2).optional(),
      city: z.string().trim().max(100).optional(),
      region: z.string().trim().max(100).optional(),
    })
    .optional()
    .catch(undefined),
  timePerWeek: z.string().trim().max(100).optional(),
  budget: z.string().trim().max(100),
  assets: z.array(z.string().trim().max(100)).max(40),
  skills: z.array(z.string().trim().max(100)).max(40),
  loves: z.array(z.string().trim().max(100)).max(20).optional(),
  languages: z.array(z.string().trim().max(60)).max(10),
  workStyle: z.string().trim().max(100),
});
export type Intake = z.infer<typeof IntakeSchema>;

const currency = z.enum(['GEL', 'USD']).catch('USD');

export const IdeaSchema = z.object({
  title: z.string().trim().min(1),
  emoji: z.string().trim().max(8).catch('🚀'),
  oneLiner: z.string().trim(),
  whyYou: strList,
  firstMoney: z.string().trim(),
  startCost: z.string().trim(),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium'),
  firstOrderEta: z.string().trim(),
  currency,
  evidence: z
    .array(z.object({ title: z.string().trim(), detail: z.string().trim(), source: optStr, url: optUrl }))
    .catch([]),
  handsOff: z.boolean().optional().catch(undefined),
  yourPart: optStr,
  /** Set when the idea came from the opportunity hunt: the gap it fills, tested for 48 hours. */
  gap: z.object({ kind: z.string(), missing: z.string() }).optional().catch(undefined),
  researchNotes: z.string().max(20000).optional(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const IdeaModeSchema = z.enum(['hands-on', 'hands-off']).catch('hands-on');
export type IdeaMode = z.infer<typeof IdeaModeSchema>;

const TaskKind = z.enum(['setup', 'post', 'message', 'do', 'buy', 'learn']).catch('do');

const TaskDraftSchema = z.object({
  title: z.string().trim().min(1),
  why: z.string().trim(),
  kind: TaskKind,
  copyText: optStr,
  url: optUrl,
  linkLabel: optStr,
  share: z.enum(SHARE_TARGETS).optional().catch(undefined),
  mapsQuery: optStr,
});
export type TaskDraft = z.infer<typeof TaskDraftSchema>;

export const KitSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().catch(''),
  tagline: z.string().trim(),
  emoji: z.string().trim().max(8).catch('🚀'),
  offer: z.object({
    title: z.string().trim(),
    description: z.string().trim(),
    price: z.number(),
    unit: z.string().trim(),
    priceReason: z.string().trim(),
    includes: strList,
    excludes: strList,
  }),
  website: z.object({
    language: z.string().trim().catch('en'),
    headline: z.string().trim(),
    subheadline: z.string().trim(),
    bullets: strList,
    cta: z.string().trim(),
    form: z.object({
      name: z.string().trim(),
      contact: z.string().trim(),
      message: z.string().trim(),
      submit: z.string().trim(),
      thanks: z.string().trim(),
    }),
  }),
  channels: z
    .array(
      z.object({
        name: z.string().trim(),
        url: optUrl,
        why: z.string().trim(),
        postText: z.string().trim(),
      }),
    )
    .catch([]),
  replyScripts: z.array(z.object({ situation: z.string().trim(), text: z.string().trim() })).catch([]),
  shoppingList: z
    .array(
      z.object({
        item: z.string().trim(),
        price: optStr,
        where: optStr,
        url: optUrl,
        why: z.string().trim(),
      }),
    )
    .catch([]),
  learn: z.array(z.object({ term: z.string().trim(), explain: z.string().trim() })).catch([]),
  firstTasks: z.array(TaskDraftSchema).min(1),
  /** Filled in later by the weekly scout: who else sells this nearby and for how much. */
  market: z
    .object({
      summary: z.string().trim(),
      competitors: z.array(z.object({ name: z.string().trim(), price: optStr, url: optUrl })).catch([]),
      checkedAt: z.string(),
    })
    .optional()
    .catch(undefined),
});
export type Kit = z.infer<typeof KitSchema>;

export const RULES = `Rules:
- The user is a beginner who has never run a business. Explain things in one plain sentence.
- Never invent demand numbers, reviews, or guaranteed income. Prices are test offers.
- No spend before signal: buying equipment or ads only after a real order.
- LANGUAGE: customer-facing text (posts, website, reply scripts, messages to send) is written ONLY in
  market.customerLanguage — the language the BUYERS speak. The languages the user speaks never decide it
  (a Georgian speaker in Philadelphia writes to customers in English). If market.secondLanguage is set, add a
  second version in it on a new line. For online services sold to remote clients, use English.
- App-facing text (titles, explanations, tasks) is in simple English.
- Currency: market.currency.
- Only use URLs that appear in the research notes; omit a URL rather than guess.
- A channel or store URL must point to the actual place (a specific group, channel, marketplace category
  or shop page) — never a help/support article, login page or search-results page.`;

const COUNTRY_CODES: Record<string, string> = {
  georgia: 'GE',
  'საქართველო': 'GE',
  armenia: 'AM',
  azerbaijan: 'AZ',
  turkey: 'TR',
  türkiye: 'TR',
  ukraine: 'UA',
  russia: 'RU',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  poland: 'PL',
  'united kingdom': 'GB',
  uk: 'GB',
  'united states': 'US',
  usa: 'US',
  canada: 'CA',
};

/** Where web search should be localized. Prefers the device's reverse-geocoded area. */
export function searchLocation(intake: Intake): SearchLocation {
  const parts = intake.location.split(',').map((p) => p.trim()).filter(Boolean);
  const fromLabel = COUNTRY_CODES[(parts.at(-1) ?? '').toLowerCase()];
  const inGeorgia = /tbilisi|batumi|kutaisi|rustavi|georgia|საქართველო/i.test(intake.location);
  const country = intake.area?.countryCode?.toUpperCase() ?? fromLabel ?? (inGeorgia ? 'GE' : undefined);
  // Labels look like "district, city, region, country" or "city, country".
  const city = intake.area?.city ?? (parts.length >= 3 ? parts[1] : parts[0]);
  return { country, city, region: intake.area?.region };
}

const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  GE: 'Georgian',
  US: 'English',
  GB: 'English',
  CA: 'English',
  AU: 'English',
  IE: 'English',
  NZ: 'English',
  DE: 'German',
  AT: 'German',
  FR: 'French',
  ES: 'Spanish',
  IT: 'Italian',
  PL: 'Polish',
  UA: 'Ukrainian',
  RU: 'Russian',
  TR: 'Turkish',
  AM: 'Armenian',
  AZ: 'Azerbaijani',
};

/** Who the customers are: decides customer-facing language and currency, independent of the user's languages. */
export function marketFor(intake: Intake) {
  const { country, city } = searchLocation(intake);
  const customerLanguage =
    (country && LANGUAGE_BY_COUNTRY[country]) || `the main local language of ${intake.location}`;
  return {
    country: country ?? 'unknown',
    city: city ?? intake.location,
    customerLanguage,
    // Tourists and expats in Georgia often read English; elsewhere one language keeps posts clean.
    secondLanguage: country === 'GE' ? 'English' : undefined,
    currency: country === 'GE' ? ('GEL' as const) : ('USD' as const),
  };
}

export function intakeText(intake: Intake) {
  const { coords: _coords, area: _area, ...rest } = intake;
  return JSON.stringify({ ...rest, market: marketFor(intake), today: new Date().toISOString().slice(0, 10) });
}

/** Cache key for market research: same answers in the same place reuse the same notes. */
export function researchKey(intake: Intake, mode: IdeaMode) {
  const norm = (list: string[]) => [...list].map((s) => s.toLowerCase()).sort();
  return JSON.stringify({
    v: 3,
    mode,
    start: intake.start,
    product: intake.product?.toLowerCase(),
    location: intake.location.toLowerCase(),
    budget: intake.budget,
    assets: norm(intake.assets),
    skills: norm(intake.skills),
    loves: norm(intake.loves ?? []),
    languages: norm(intake.languages),
    workStyle: intake.workStyle,
  });
}

const LOVES_RULE = `If the intake has "loves", those are what the person would be happiest doing: every candidate should be built
around at least one of them (still easy to start and earning fast). If "loves" is missing or empty, any fit is fine.`;

/** How many distinct candidates one research pass covers; "Another idea" reuses it until they run out. */
export const CANDIDATES_PER_RESEARCH = 3;

const RESEARCH_INSTRUCTIONS = `You are a local market researcher helping a beginner start a tiny business. Use web search.
Pick ${CANDIDATES_PER_RESEARCH} clearly different candidate tiny businesses this exact person could start this week
(or, for a person who already sells something, ${CANDIDATES_PER_RESEARCH} different ways to sell it), using what they have,
what they are good at and the languages they speak. Online services with remote clients are fine if their skills are online skills.
${LOVES_RULE}
For EACH candidate collect concrete, current facts: real local demand signals (season, events, what people pay for),
typical local prices, real places in that city where BUYERS of this service/product look or ask (named local Facebook
groups, marketplaces, classifieds, Telegram channels, apps that operate there — with URLs; not job-seeker boards
and not other cities), and real stores with current prices for any starter supplies (with URLs).
Write compact plain-text notes grouped under a heading per candidate, with source name and URL for each fact.
Do not invent anything you did not find. Be efficient: a few targeted searches, no filler.`;

/** What Kisa can already do on its own; hands-off ideas must lean on exactly this. */
const KISA_CAN = `Kisa (an AI) already does, by itself: research, the business name and offer, a live website with an order form,
every post and caption, reply drafts for each order, price advice, and a daily plan. Kisa can also write documents,
translations, CVs, product descriptions, menus, social posts, scripts, and simple designs/printables as text.
The person only has to: tap to post what Kisa wrote, send the replies Kisa drafted, deliver, and get paid.`;

const HANDS_OFF_RESEARCH = `You are a market researcher for Kisa. ${KISA_CAN}
Use web search. Find ${CANDIDATES_PER_RESEARCH} clearly different tiny businesses where Kisa can do almost all of the work
and the person needs about 10–15 minutes a day: mostly digital products or done-for-you services that Kisa produces
(e.g. writing, translating, CVs, menus, social posts for local shops, listings, printables), sold to buyers in the
person's city or online. Legal and honest only: no spam, no fake reviews, no hiding that AI helped where that matters.
${LOVES_RULE}
For EACH candidate collect concrete, current facts: who pays for this and how much (real prices), where those buyers
are (named groups, marketplaces, directories — with URLs), and what the person would still have to do.
Write compact plain-text notes grouped under a heading per candidate, with source name and URL for each fact.
Do not invent anything you did not find. Be efficient: a few targeted searches, no filler.`;

export async function researchMarket(intake: Intake, exclude: string[], mode: IdeaMode = 'hands-on') {
  return research(
    mode === 'hands-off' ? HANDS_OFF_RESEARCH : RESEARCH_INSTRUCTIONS,
    `User intake: ${intakeText(intake)}
${exclude.length ? `Skip these, the user already rejected them: ${exclude.join('; ')}` : ''}`,
    { task: mode === 'hands-off' ? 'research-hands-off' : 'research-idea', location: searchLocation(intake), maxSearches: 4 },
  );
}

const IDEA_JSON = `Return JSON:
{ "title": "short business name idea", "emoji": "one emoji", "oneLiner": "what you sell to whom",
  "whyYou": ["3 short reasons tied to the user's answers"], "firstMoney": "e.g. 40–60₾ per job",
  "startCost": "e.g. 0₾ until first order", "difficulty": "easy|medium|hard",
  "firstOrderEta": "e.g. 2–5 days", "currency": "GEL|USD",
  "yourPart": "one short line: what the person still does (hands-off ideas only, else omit)",
  "evidence": [{ "title": "...", "detail": "...", "source": "source name", "url": "https://..." }] }`;

const IDEA_SYSTEM = `You are Kisa, an AI business partner. From the research notes, pick ONE tiny business for this user —
the EASIEST one to start this week that earns first money fastest with the least risk, fitting their budget, assets,
skills and location. Assume a beginner with a few spare hours a day unless the intake says otherwise.
${LOVES_RULE}
Never pick anything from the "already rejected" list; pick a clearly different business instead.
${RULES}
${IDEA_JSON}`;

const HANDS_OFF_IDEA_SYSTEM = `You are Kisa, an AI business partner. ${KISA_CAN}
From the research notes, pick ONE tiny business that Kisa can run almost entirely, where the person's part is about
10–15 minutes a day, and that can earn first money fastest with the least risk. Say plainly in "yourPart" what is left.
${LOVES_RULE}
Never pick anything from the "already rejected" list; pick a clearly different business instead.
${RULES}
${IDEA_JSON}`;

export async function composeIdea(
  intake: Intake,
  exclude: string[],
  notes: string | null,
  mode: IdeaMode = 'hands-on',
  focus?: string,
): Promise<Idea> {
  const handsOff = mode === 'hands-off';
  const idea = await composeJson(
    IdeaSchema.omit({ researchNotes: true, gap: true }),
    handsOff ? HANDS_OFF_IDEA_SYSTEM : IDEA_SYSTEM,
    `User intake: ${intakeText(intake)}
${exclude.length ? `Already rejected: ${exclude.join('; ')}` : ''}
${focus ? `The user chose this exact opportunity — build the idea around it, use its evidence:\n${focus}\n` : ''}

${notes ? `Web research notes:\n${notes}` : 'No live research available; stay conservative.'}`,
    { task: handsOff ? 'idea-hands-off' : 'idea' },
  );
  const broken = await brokenLinks(idea.evidence.map((e) => e.url), 4000);
  return {
    ...idea,
    currency: marketFor(intake).currency,
    handsOff: handsOff || undefined,
    yourPart: handsOff ? idea.yourPart : undefined,
    evidence: idea.evidence.map((e) => (e.url && broken.has(e.url) ? { ...e, url: undefined } : e)),
    researchNotes: notes?.slice(0, 20000),
  };
}

const TASK_RULES = `Task rules — every task must feel like Kisa already did the work:
- One action, under 10 minutes, on a phone. Title starts with a verb ("Post…", "Send…", "Visit…").
- If anything is posted or sent, put the exact ready-to-paste text in "copyText" (customer language).
- Make it ONE TAP with exactly one of:
  "url": the exact place from the research notes / business channels (a specific group, channel, marketplace
         category or store page) — never a URL you did not get from there;
  "share": "whatsapp" | "telegram" | "sms" | "email" | "facebook" — to send copyText to people the user knows
           (the app builds the link with the text filled in);
  "mapsQuery": a Google Maps search for nearby target customers to visit or call, e.g. "cafes near Rittenhouse Square Philadelphia".
- "linkLabel": a short button text, e.g. "Open the group", "Post on Marketplace", "See cafes nearby".
- Never write "find", "search for", "research", "look for", "think about" or "decide" — Kisa already did that.
  Name the exact group, shop type or person and link it.
Task JSON: { "title": "...", "why": "one sentence", "kind": "setup|post|message|do|buy|learn",
  "copyText": "...", "url": "https://...", "share": "whatsapp|telegram|sms|email|facebook", "mapsQuery": "...", "linkLabel": "..." }`;

const KIT_SYSTEM = `You are Kisa, an AI business partner who sets up a tiny business for a beginner so they only have to
do the human parts. Build the complete starter kit for the chosen business.
${RULES}
${TASK_RULES}
Return JSON:
{
  "name": "brand name (short, memorable, local)", "slug": "latin-lowercase-url-slug",
  "tagline": "one line", "emoji": "one emoji",
  "offer": { "title": "...", "description": "...", "price": number, "unit": "per job / per hour / per item",
             "priceReason": "one sentence why this price", "includes": ["..."], "excludes": ["..."] },
  "website": { "language": "ka|en|...", "headline": "...", "subheadline": "...", "bullets": ["3-4"], "cta": "...",
               "form": { "name": "label", "contact": "label (phone / WhatsApp / Telegram)", "message": "label",
                         "submit": "button text", "thanks": "thank-you message" } },
  "channels": [{ "name": "readable name of the real place (not the URL)", "url": "https://... (the group/category itself, not one listing)", "why": "one sentence",
                 "postText": "ready-to-post text ending with: order via the link {{SITE_URL}}" }],
  "replyScripts": [{ "situation": "First reply to a new lead | Customer says too expensive | Confirming the order | After the job: ask for review/referral",
                     "text": "..." }],
  "shoppingList": [{ "item": "...", "price": "...", "where": "real store", "url": "https://...", "why": "..." }],
  "learn": [{ "term": "e.g. Lead", "explain": "one plain sentence" }],
  "firstTasks": [Task JSON, ...]
}
channels: 3–5 real places in the user's city where buyers are (not job boards for job seekers). replyScripts: exactly the 4 situations. shoppingList: only what is truly needed,
can be empty. learn: 3–5 beginner terms used in this business.
firstTasks: exactly 3 tasks for TODAY that lead to the first customer, e.g. (1) post the offer in the best channel
(copyText + that channel's url), (2) send the website link to friends who might need it or know someone
(copyText + share "whatsapp"), (3) walk into or call 5 nearby target customers (mapsQuery + a short script in copyText).
Never "buy" before the first order.
If the business is hands-off (Kisa runs it), keep the person's tasks to tapping, posting and sending what Kisa wrote.
Use the placeholder {{SITE_URL}} wherever the business website link belongs.`;

export async function buildKit(intake: Intake, idea: Idea): Promise<Kit> {
  const { researchNotes, ...ideaPublic } = idea;
  return composeJson(
    KitSchema,
    KIT_SYSTEM,
    `User intake: ${intakeText(intake)}
Chosen business: ${JSON.stringify(ideaPublic)}
${researchNotes ? `Web research notes:\n${researchNotes}` : ''}`,
    { task: 'kit' },
  );
}

/** Turns share targets and map searches into real deep links. */
function linkTasks(tasks: TaskDraft[], siteUrl: string): TaskDraft[] {
  return tasks.map(({ share, mapsQuery, ...rest }) => {
    const task: TaskDraft = { ...rest, share: undefined, mapsQuery: undefined };
    if (task.url) return task;
    if (share) {
      const text = task.copyText || siteUrl;
      return { ...task, url: shareLink(share, text, siteUrl), linkLabel: task.linkLabel || shareLabel(share) };
    }
    if (mapsQuery) return { ...task, url: mapsLink(mapsQuery), linkLabel: task.linkLabel || 'See them on the map' };
    return task;
  });
}

/** Builds deep links and drops every web link that doesn't actually open. */
export async function finalizeTasks(tasks: TaskDraft[], siteUrl: string) {
  const linked = linkTasks(tasks, siteUrl);
  const broken = await brokenLinks(linked.map((t) => t.url));
  return linked.map((t) => (t.url && broken.has(t.url) ? { ...t, url: undefined, linkLabel: undefined } : t));
}

export async function finalizeKit(kit: Kit, siteUrl: string): Promise<Kit> {
  const linked = linkTasks(kit.firstTasks, siteUrl);
  const broken = await brokenLinks([
    ...kit.channels.map((c) => c.url),
    ...kit.shoppingList.map((s) => s.url),
    ...linked.map((t) => t.url),
  ]);
  const ok = (url?: string) => (url && broken.has(url) ? undefined : url);
  return {
    ...kit,
    channels: kit.channels.map((c) => ({ ...c, url: ok(c.url) })),
    shoppingList: kit.shoppingList.map((s) => ({ ...s, url: ok(s.url) })),
    firstTasks: linked.map((t) => (t.url && broken.has(t.url) ? { ...t, url: undefined, linkLabel: undefined } : t)),
  };
}

export type Stage = 'launch' | 'first_sales' | 'grow';

export function stageFor(salesCount: number): Stage {
  if (salesCount >= 3) return 'grow';
  if (salesCount >= 1) return 'first_sales';
  return 'launch';
}

/** The parts of a kit the coach and reply writer actually need (keeps prompts small and cheap). */
function kitBrief(kit: Kit) {
  return {
    name: kit.name,
    tagline: kit.tagline,
    language: kit.website.language,
    offer: { title: kit.offer.title, price: kit.offer.price, unit: kit.offer.unit, includes: kit.offer.includes },
    channels: kit.channels.map((c) => ({ name: c.name, url: c.url })),
    priceCheck: kit.market?.summary,
  };
}

const AdaptSchema = z.object({
  coach: z.string().trim(),
  tasks: z.array(TaskDraftSchema).min(1).max(3),
});

const ADAPT_SYSTEM = `You are Kisa, an AI business partner coaching a beginner day by day. Based on what happened,
decide the next 1–3 tasks (never more than 3) and a short coach message (2–3 sentences, warm, concrete,
explains WHY in plain words).
${RULES}
Stage guide:
- launch (no sales yet): get the first customer. If no replies after a couple of check-ins, change something:
  a different channel, a clearer photo, a smaller/cheaper starter offer, or asking friends directly.
- first_sales (1–2 sales): deliver well, ask for a review/referral, post proof (photo of finished work), repeat what worked.
- grow (3+ sales): build simple systems — repeat-customer message, referral offer, a step-by-step job checklist,
  test a slightly higher price, add one new channel. Buying equipment is OK now if it clearly saves time.
Read siteVisits (real people who opened the website, bots excluded) together with leads:
- few or no visits → the problem is reach: post in a new channel, send the link to more people, visit in person.
- visits but no orders → the problem is the offer: make it smaller/cheaper, add a clear photo or example, clearer headline.
- orders but no sales → the problem is follow-up: reply faster, confirm a time, ask for payment simply.
Mention the visit numbers in the coach message when they explain what to do next.
Use the business website link (siteUrl) where useful. "url" may only be one of business.channels urls or siteUrl.
${TASK_RULES}
Return JSON: { "coach": "...", "tasks": [Task JSON, ...] }`;

export async function adaptPlan(input: {
  intake: Intake;
  kit: Kit;
  stage: Stage;
  siteUrl: string;
  money: { earned: number; spent: number; sales: number };
  siteVisits: { total: number; week: number; today: number };
  leads: { status: string; message: string }[];
  recentTasks: { title: string; status: string }[];
  checkins: { events: string[]; note?: string; createdAt: string }[];
}) {
  const { kit, intake, ...rest } = input;
  return composeJson(
    AdaptSchema,
    ADAPT_SYSTEM,
    JSON.stringify({
      ...rest,
      business: kitBrief(kit),
      location: intake.location,
      market: marketFor(intake),
      leads: rest.leads.map((l) => ({ status: l.status, message: l.message.slice(0, 200) })),
    }),
    { task: 'adapt' },
  );
}

const REPLY_SYSTEM = `You are Kisa, writing a reply for a beginner business owner to send to a new customer lead.
Write in the language the customer used (default: the business website language). Friendly, short,
confirm what they asked, state the price from the offer, ask the one question needed to book, propose a time.
At most 5 short lines. Plain text only — no markdown, no asterisks; it is pasted into a chat app.
If there is a conversation, answer the customer's LATEST message and move toward a booked, paid order.
When the customer has agreed (or asks how to pay) and "payment" is given, include exactly those payment details.
Never invent payment details, availability you were not told, or discounts beyond the offer.
Output only the message text.`;

export type ChatTurn = { from: 'customer' | 'you'; text: string };
export type Payment = { link?: string; details?: string };

export async function draftLeadReply(input: {
  kit: Kit;
  siteUrl: string;
  lead: { name: string; contact: string; message: string };
  conversation?: ChatTurn[];
  payment?: Payment | null;
}) {
  return composeText(
    REPLY_SYSTEM,
    JSON.stringify({
      business: kitBrief(input.kit),
      siteUrl: input.siteUrl,
      lead: input.lead,
      conversation: input.conversation?.slice(-12),
      payment: input.payment ?? undefined,
    }),
    { task: 'reply', model: fastModel() },
  );
}

const FOLLOWUP_SYSTEM = `You are Kisa, writing a short follow-up for a beginner business owner. They replied to a customer
a day or more ago and heard nothing back. Write a friendly, low-pressure nudge in the customer's language (default: the
business website language): remind what they asked, offer one concrete time or a tiny incentive if it fits the offer,
and make saying yes easy. At most 3 short lines. Plain text only, no markdown. Output only the message text.`;

export async function draftFollowUp(input: {
  kit: Kit;
  lead: { name: string; message: string };
  reply?: string;
}) {
  return composeText(
    FOLLOWUP_SYSTEM,
    JSON.stringify({ business: kitBrief(input.kit), lead: input.lead, yourLastReply: input.reply }),
    { task: 'followup', model: fastModel() },
  );
}

const SiteTuneSchema = z.object({
  why: z.string().trim(),
  headline: z.string().trim().min(1),
  subheadline: z.string().trim(),
  bullets: strList,
  cta: z.string().trim(),
  offerTitle: z.string().trim(),
  offerDescription: z.string().trim(),
  price: z.number().positive(),
});
export type SiteTune = z.infer<typeof SiteTuneSchema>;

const SITE_TUNE_SYSTEM = `You are Kisa, a conversion expert. People open this tiny business's website but don't order.
Rewrite the page so more visitors order today. Keep the same business and honest claims (no fake reviews, no invented
numbers). Typical fixes: a sharper headline that names the customer and the result, a smaller and cheaper first order
(a "starter" or "trial" offer) so trying is easy, concrete bullets (what they get, how fast, where), a direct CTA.
Lower the price only if competitors are cheaper or the offer feels big for a first try; never by more than 30%.
All customer-facing text in the website's language. "why" is one plain English sentence for the owner.
Return JSON: { "why": "...", "headline": "...", "subheadline": "...", "bullets": ["3-4"], "cta": "...",
  "offerTitle": "...", "offerDescription": "...", "price": number }`;

export async function tuneWebsite(input: {
  intake: Intake;
  kit: Kit;
  visits: { total: number; week: number };
  orders: number;
}) {
  const { kit } = input;
  return composeJson(
    SiteTuneSchema,
    SITE_TUNE_SYSTEM,
    JSON.stringify({
      market: marketFor(input.intake),
      visits: input.visits,
      orders: input.orders,
      website: kit.website,
      offer: kit.offer,
      competitors: kit.market?.competitors ?? [],
    }),
    { task: 'site-tune' },
  );
}

const SCOUT_RESEARCH = `You are a market scout for a tiny local business. Use web search. Find, for this exact business and city:
1) NEW places where its buyers look or ask right now — named local Facebook groups, subreddits, Telegram channels,
   marketplace categories, community boards, directories (with URLs; not the ones already listed, not job boards);
2) 3–5 real competitors nearby or online selling the same thing, with their current prices and URLs
   (re-check prices of knownCompetitors only if you pass them anyway; spend searches on what is new).
Write compact plain-text notes with source name and URL for each fact. Never invent anything.
Be efficient: at most 3 targeted searches, no filler.`;

const ScoutSchema = z.object({
  summary: z.string().trim(),
  channels: z
    .array(z.object({ name: z.string().trim(), url: optUrl, why: z.string().trim(), postText: z.string().trim() }))
    .catch([]),
  competitors: z
    .array(
      z.object({
        name: z.string().trim(),
        price: optStr.transform((p) => (p && /\d/.test(p) ? p : undefined)),
        url: optUrl,
      }),
    )
    .catch([]),
});

const SCOUT_SYSTEM = `You are Kisa. From the scout notes, return new places to post and the competitor picture.
${RULES}
channels: up to 3 NEW places (not in business.channels) with a ready-to-post text in the customer language that ends with
the website link {{SITE_URL}}. competitors: the real ones found, with price as written in the source.
summary: one plain English sentence comparing our price with competitors (e.g. "Others charge $50–70; your $45 is the cheapest.").
Return JSON: { "summary": "...", "channels": [{ "name": "...", "url": "https://...", "why": "...", "postText": "..." }],
  "competitors": [{ "name": "...", "price": "...", "url": "https://..." }] }`;

export async function scoutMarket(input: { intake: Intake; kit: Kit }) {
  const brief = kitBrief(input.kit);
  const notes = await research(
    SCOUT_RESEARCH,
    JSON.stringify({
      business: brief,
      offer: { title: input.kit.offer.title, price: input.kit.offer.price, unit: input.kit.offer.unit },
      location: input.intake.location,
      market: marketFor(input.intake),
      knownCompetitors: input.kit.market?.competitors.map((c) => c.name) ?? [],
    }),
    { task: 'research-scout', location: searchLocation(input.intake), maxSearches: 3 },
  );
  if (!notes) return null;
  return composeJson(
    ScoutSchema,
    SCOUT_SYSTEM,
    JSON.stringify({ business: brief, market: marketFor(input.intake), notes }),
    { task: 'scout' },
  );
}

export function newTaskId() {
  return `t_${randomUUID().slice(0, 12)}`;
}
