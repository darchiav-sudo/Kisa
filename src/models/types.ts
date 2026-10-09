export interface UserProfile {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

/** Structured place from reverse geocoding; lets the server localize web search. */
export interface Area {
  countryCode?: string;
  city?: string;
  region?: string;
}

export interface Coords {
  lat: number;
  lng: number;
}

export interface Intake {
  start: 'new' | 'existing';
  product?: string;
  location: string;
  coords?: Coords;
  area?: Area;
  timePerWeek?: string;
  budget: string;
  assets: string[];
  skills: string[];
  /** What they'd be happiest building the business around (picked from their skills and assets). */
  loves?: string[];
  languages: string[];
  workStyle: string;
}

export type Currency = 'GEL' | 'USD';

export interface Idea {
  title: string;
  emoji: string;
  oneLiner: string;
  whyYou: string[];
  firstMoney: string;
  startCost: string;
  difficulty: 'easy' | 'medium' | 'hard';
  firstOrderEta: string;
  currency: Currency;
  evidence: { title: string; detail: string; source?: string; url?: string }[];
  /** "Kisa runs it" mode: Kisa does the work, the user only approves. */
  handsOff?: boolean;
  /** What the user still has to do, in one line (hands-off ideas). */
  yourPart?: string;
  /** Set when the idea fills a hunted gap; the business starts as a 48-hour test. */
  gap?: { kind: GapKind; missing: string };
  /** Research notes passed back to the server when building; not shown. */
  researchNotes?: string;
}

export type GapKind = 'unanswered' | 'complaints' | 'missing' | 'language' | 'timing' | 'import';

/** A real, proven hole in the local market, found by the opportunity hunt. */
export interface Gap {
  title: string;
  emoji: string;
  kind: GapKind;
  oneLiner: string;
  missing: string;
  evidence: { title: string; detail: string; source?: string; url?: string }[];
  demand: number;
  competition: number;
  fit: number;
  whyYou: string;
  firstMoney: string;
  startCost: string;
  speed: string;
}

export interface Kit {
  name: string;
  tagline: string;
  emoji: string;
  offer: {
    title: string;
    description: string;
    price: number;
    unit: string;
    priceReason: string;
    includes: string[];
    excludes: string[];
  };
  website: { language: string; headline: string; subheadline: string; bullets: string[]; cta: string };
  channels: { name: string; url?: string; why: string; postText: string }[];
  replyScripts: { situation: string; text: string }[];
  shoppingList: { item: string; price?: string; where?: string; url?: string; why: string }[];
  learn: { term: string; explain: string }[];
}

export type TaskStatus = 'todo' | 'done' | 'skipped' | 'replaced';

export interface Task {
  id: string;
  title: string;
  why: string;
  kind: 'setup' | 'post' | 'message' | 'do' | 'buy' | 'learn';
  copyText?: string;
  url?: string;
  linkLabel?: string;
  status: TaskStatus;
  createdAt: string;
}

export type LeadStatus = 'new' | 'replied' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  contact: string;
  message: string;
  status: LeadStatus;
  /** Written by Kisa when the customer went quiet after your reply. */
  followUp?: string;
  /** Where the customer came from; Telegram customers are answered through Kisa's bot. */
  channel?: 'site' | 'telegram';
  createdAt: string;
}

export interface LeadMessage {
  id: string;
  direction: 'in' | 'out';
  text: string;
  createdAt: string;
  /** Sent by Kisa less than 48 hours ago, so Telegram still lets us delete it. */
  canDelete?: boolean;
}

export interface MoneyEntry {
  id: string;
  kind: 'income' | 'expense';
  amount: number;
  label: string;
  createdAt: string;
}

export interface Payment {
  link?: string;
  details?: string;
}

export interface Connections {
  /** Kisa's shared Telegram bot username; null until the server has a bot token. */
  telegramBot: string | null;
  telegramChannel: { title: string; username?: string } | null;
  /** Kisa answers customers on its own instead of waiting for the owner's tap. */
  autoReply: boolean;
  payment: Payment | null;
}

/** Something Kisa did on its own (scouted the market, rewrote the site, planned the day, wrote a follow-up). */
export interface AgentEvent {
  id: string;
  kind: 'scout' | 'site' | 'plan' | 'followup' | string;
  title: string;
  detail?: string;
  createdAt: string;
}

export type Stage = 'launch' | 'first_sales' | 'grow';

export interface BusinessSummary {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  status: 'active' | 'archived';
  createdAt: string;
  earned: number;
  sales: number;
  currency: Currency;
}

export interface SavedIdea {
  id: string;
  intake: Intake;
  idea: Idea;
  createdAt: string;
}

export interface Business {
  id: string;
  slug: string;
  siteUrl: string;
  status: string;
  createdAt: string;
  intake: Intake;
  idea: Idea;
  kit: Kit;
  coach: string | null;
  stage: Stage;
  money: { earned: number; spent: number; sales: number; currency: Currency };
  /** Real people who opened the website (bots and link previews excluded). */
  visits?: { total: number; week: number; today: number };
  tasks: Task[];
  leads: Lead[];
  agentLog?: AgentEvent[];
  connections?: Connections;
}
