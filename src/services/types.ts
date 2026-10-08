import type {
  AppMode,
  BusinessProfile,
  Launch,
  Lead,
  MoneyProfile,
  UserProfile,
} from '@/src/models/types';

export interface OpportunityService {
  rankForMoney(profile: MoneyProfile): Promise<Launch[]>;
  rankForBusiness(profile: BusinessProfile): Promise<Launch[]>;
}

export interface DemandVerificationService {
  verify(launchId: string): Promise<{ ok: boolean; summary: string }>;
}

export interface LaunchGenerationService {
  generate(mode: AppMode, profile: MoneyProfile | BusinessProfile): Promise<Launch[]>;
}

export interface DistributionService {
  planChannels(launchId: string): Promise<{ name: string; url?: string }[]>;
  simulatePublish(launchId: string, channels: string[]): Promise<{ publishedAt: string }>;
}

export interface MarketplaceService {
  simulateListing(launchId: string, title: string): Promise<{ listingId: string }>;
}

export interface LocalBusinessService {
  listPartners(launchId: string): Promise<{ name: string; detail: string; phone?: string }[]>;
}

export interface LeadService {
  simulateInbound(launchId: string): Promise<Lead>;
}

export interface PermissionService {
  request(kind: 'notifications' | 'location'): Promise<boolean>;
}

export interface UserProfileService {
  get(): Promise<UserProfile | null>;
  upsert(profile: Partial<UserProfile>): Promise<UserProfile>;
}

export interface BusinessProfileService {
  get(): Promise<BusinessProfile | null>;
  save(profile: BusinessProfile): Promise<BusinessProfile>;
}

export interface AnalyticsService {
  track(event: string, props?: Record<string, string | number | boolean | null>): void;
}

export interface AppServices {
  opportunity: OpportunityService;
  demand: DemandVerificationService;
  launchGeneration: LaunchGenerationService;
  distribution: DistributionService;
  marketplace: MarketplaceService;
  localBusiness: LocalBusinessService;
  lead: LeadService;
  permission: PermissionService;
  userProfile: UserProfileService;
  businessProfile: BusinessProfileService;
  analytics: AnalyticsService;
}
