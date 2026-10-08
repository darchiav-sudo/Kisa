export type AppMode = 'money' | 'business';

export type ChannelPreference = 'online' | 'offline' | 'either';

export type LaunchActionType =
  | 'approve'
  | 'copy'
  | 'simulate_publish'
  | 'simulate_lead'
  | 'simulate_wait'
  | 'open_link'
  | 'mark_done'
  | 'collect_payment'
  | 'repeat';

export type LaunchStepKind =
  | 'info'
  | 'offer'
  | 'distribution'
  | 'approve'
  | 'wait'
  | 'lead'
  | 'script'
  | 'equipment'
  | 'checklist'
  | 'payment'
  | 'repeat'
  | 'fulfillment';

export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface MoneyProfile {
  location: string;
  budgetUsd: number;
  timeHours: string;
  hasCar: boolean;
  channel: ChannelPreference;
}

export interface BusinessProfile {
  product: string;
  location: string;
  adBudget: string;
  hasAudience: boolean;
  remoteOk: boolean;
  goal: string;
}

export interface LaunchEvidence {
  id: string;
  title: string;
  detail: string;
  sourceLabel?: string;
}

export interface LaunchEconomics {
  currency: 'USD' | 'GEL';
  starterCost?: number;
  reserveLeft?: number;
  offerPrice: number;
  offerLabel: string;
  targetUnits?: number;
  adSpend: number;
  notes: string[];
}

export interface LaunchChannel {
  id: string;
  name: string;
  url?: string;
  kind: 'social' | 'marketplace' | 'local' | 'partner' | 'delivery';
}

export interface LaunchAction {
  id: string;
  type: LaunchActionType;
  label: string;
  copyText?: string;
  url?: string;
  earningAmount?: number;
  primary?: boolean;
}

export interface LaunchStep {
  id: string;
  kind: LaunchStepKind;
  title: string;
  description: string;
  script?: string;
  checklist?: string[];
  checklistOut?: string[];
  items?: { title: string; price?: string; detail?: string; url?: string }[];
  channels?: LaunchChannel[];
  actions: LaunchAction[];
  autoAdvanceMs?: number;
}

export interface Launch {
  id: string;
  mode: AppMode;
  rank: number;
  isPrimary: boolean;
  title: string;
  kicker: string;
  summary: string;
  tags: string[];
  locationLabel: string;
  economics: LaunchEconomics;
  evidence: LaunchEvidence[];
  steps: LaunchStep[];
  whyNow?: string;
}

export interface Lead {
  id: string;
  launchId: string;
  name: string;
  message: string;
  zip?: string;
  createdAt: string;
}

export interface LaunchProgress {
  launchId: string;
  currentStepIndex: number;
  completedStepIds: string[];
  startedAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'abandoned';
  simulatedPublished?: boolean;
  leadId?: string;
  booked?: boolean;
}

export interface EarningsEvent {
  id: string;
  launchId: string;
  amount: number;
  currency: 'USD' | 'GEL';
  label: string;
  at: string;
}

export interface PersistedAppState {
  hydrated: boolean;
  onboardingComplete: boolean;
  mode: AppMode | null;
  user: UserProfile | null;
  moneyProfile: MoneyProfile | null;
  businessProfile: BusinessProfile | null;
  activeLaunchId: string | null;
  progressByLaunchId: Record<string, LaunchProgress>;
  earnings: EarningsEvent[];
  lastAnalysisAt: string | null;
}
