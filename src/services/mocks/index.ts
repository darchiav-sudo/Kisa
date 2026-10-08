import {
  getBusinessLaunches,
  getLaunchById,
  getMoneyLaunches,
} from '@/src/data/launches';
import type {
  BusinessProfile,
  Lead,
  MoneyProfile,
  UserProfile,
} from '@/src/models/types';
import type { AppServices } from '@/src/services/types';

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

let memoryUser: UserProfile | null = null;
let memoryBusiness: BusinessProfile | null = null;

export const mockServices: AppServices = {
  opportunity: {
    async rankForMoney(profile) {
      await delay(500);
      return getMoneyLaunches(profile);
    },
    async rankForBusiness(profile) {
      await delay(500);
      return getBusinessLaunches(profile);
    },
  },

  demand: {
    async verify(launchId) {
      await delay(300);
      const launch = getLaunchById(launchId);
      return {
        ok: true,
        summary: launch?.whyNow ?? launch?.evidence[0]?.detail ?? 'Demand signal available for demo.',
      };
    },
  },

  launchGeneration: {
    async generate(mode, profile) {
      await delay(600);
      if (mode === 'money') return getMoneyLaunches(profile as MoneyProfile);
      return getBusinessLaunches(profile as BusinessProfile);
    },
  },

  distribution: {
    async planChannels(launchId) {
      await delay(200);
      const launch = getLaunchById(launchId);
      const fromSteps =
        launch?.steps.flatMap((s) => s.channels ?? []).map((c) => ({ name: c.name, url: c.url })) ??
        [];
      if (fromSteps.length) return fromSteps;
      return [
        { name: 'Facebook local groups' },
        { name: 'Nextdoor' },
      ];
    },
    async simulatePublish(launchId, channels) {
      await delay(700);
      return { publishedAt: new Date().toISOString(), launchId, channels } as {
        publishedAt: string;
      };
    },
  },

  marketplace: {
    async simulateListing(launchId, title) {
      await delay(500);
      return { listingId: `listing_${launchId}_${title.slice(0, 8)}` };
    },
  },

  localBusiness: {
    async listPartners(launchId) {
      await delay(200);
      const launch = getLaunchById(launchId);
      return (
        launch?.steps
          .flatMap((s) => s.items ?? [])
          .map((i) => ({ name: i.title, detail: i.detail ?? '', phone: i.url })) ?? []
      );
    },
  },

  lead: {
    async simulateInbound(launchId): Promise<Lead> {
      await delay(500);
      if (launchId.includes('books') || launchId.includes('drop')) {
        return {
          id: `lead_${Date.now()}`,
          launchId,
          name: 'Nino',
          message: 'წიგნი',
          createdAt: new Date().toISOString(),
        };
      }
      return {
        id: `lead_${Date.now()}`,
        launchId,
        name: 'Maya',
        message:
          'Hi — leaves covering our sidewalk and small front yard. Can you do the $49 job this week?',
        zip: '19111',
        createdAt: new Date().toISOString(),
      };
    },
  },

  permission: {
    async request() {
      await delay(200);
      return true;
    },
  },

  userProfile: {
    async get() {
      return memoryUser;
    },
    async upsert(partial) {
      memoryUser = {
        id: memoryUser?.id ?? `user_${Date.now()}`,
        displayName: partial.displayName ?? memoryUser?.displayName ?? 'Operator',
        createdAt: memoryUser?.createdAt ?? new Date().toISOString(),
      };
      return memoryUser;
    },
  },

  businessProfile: {
    async get() {
      return memoryBusiness;
    },
    async save(profile) {
      memoryBusiness = profile;
      return profile;
    },
  },

  analytics: {
    track(event, props) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[analytics]', event, props ?? {});
      }
    },
  },
};
