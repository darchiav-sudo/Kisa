import { getBusinessLaunches, getMoneyLaunches } from '@/src/data/launches';
import type { AppServices } from '@/src/services/types';
import { apiFetch, isApiConfigured } from '@/src/lib/api';
import { mockServices } from '@/src/services/mocks';

/** HTTP-backed services when EXPO_PUBLIC_API_URL is set; otherwise mocks. */
export function createServices(): AppServices {
  if (!isApiConfigured()) return mockServices;

  return {
    ...mockServices,
    opportunity: {
      async rankForMoney(profile) {
        const res = await apiFetch<{ launches: { id: string }[] }>('/v1/launches/rank', {
          method: 'POST',
          json: { mode: 'money' },
        });
        const ids = new Set(res.launches.map((l) => l.id));
        return getMoneyLaunches(profile).filter((l) => ids.has(l.id));
      },
      async rankForBusiness(profile) {
        const res = await apiFetch<{ launches: { id: string }[] }>('/v1/launches/rank', {
          method: 'POST',
          json: { mode: 'business' },
        });
        const ids = new Set(res.launches.map((l) => l.id));
        return getBusinessLaunches(profile).filter((l) => ids.has(l.id));
      },
    },
    launchGeneration: {
      async generate(mode, profile) {
        if (mode === 'money') return getMoneyLaunches(profile as never);
        return getBusinessLaunches(profile as never);
      },
    },
    distribution: {
      async planChannels(launchId) {
        return mockServices.distribution.planChannels(launchId);
      },
      async simulatePublish(launchId, channels) {
        return apiFetch('/v1/distribution/publish', {
          method: 'POST',
          json: { launchId, channels },
        });
      },
    },
    lead: {
      async simulateInbound(launchId) {
        return apiFetch(`/v1/leads/simulate`, {
          method: 'POST',
          json: { launchId },
        });
      },
    },
    analytics: {
      track(event, props) {
        void apiFetch('/v1/analytics', {
          method: 'POST',
          json: { event, props },
        }).catch(() => undefined);
      },
    },
  };
}