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
  /** Research notes passed back to the server when building; not shown. */
  researchNotes?: string;
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
}
