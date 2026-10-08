import { getBusinessLaunches, getMoneyLaunches } from '@/src/data/launches';
import type { AppServices } from '@/src/services/types';
import { apiFetch, isApiConfigured } from '@/src/lib/api';
import { mockServices } from '@/src/services/mocks';

/** HTTP-backed services when EXPO_PUBLIC_API_URL is set; otherwise mocks. */
export function createServices(): AppServices {
  if (!isApiConfigured()) return mockServices;

  const opportunity = {
    async rankForMoney(profile: Parameters<AppServices['opportunity']['rankForMoney']>[0]) {
      const res = await apiFetch<{ launches: { id: string }[] }>('/v1/launches/rank', {
        method: 'POST',
        json: {
          mode: 'money',
          location: profile.location,
          budgetUsd: profile.budgetUsd,
          timeHours: profile.timeHours,
          hasCar: profile.hasCar,
          channel: profile.channel,
        },
      });
      const order = res.launches.map((l) => l.id);
      const byId = new Map(getMoneyLaunches(profile).map((l) => [l.id, l]));
      return order
        .map((id, i) => {
          const launch = byId.get(id);
          if (!launch) return null;
          return { ...launch, rank: i + 1, isPrimary: i === 0 };
        })
        .filter((l): l is NonNullable<typeof l> => l != null);
    },
    async rankForBusiness(profile: Parameters<AppServices['opportunity']['rankForBusiness']>[0]) {
      const res = await apiFetch<{ launches: { id: string }[] }>('/v1/launches/rank', {
        method: 'POST',
        json: {
          mode: 'business',
          product: profile.product,
          location: profile.location,
          adBudget: profile.adBudget,
          hasAudience: profile.hasAudience,
          remoteOk: profile.remoteOk,
          goal: profile.goal,
        },
      });
      const order = res.launches.map((l) => l.id);
      const byId = new Map(getBusinessLaunches(profile).map((l) => [l.id, l]));
      return order
        .map((id, i) => {
          const launch = byId.get(id);
          if (!launch) return null;
          return { ...launch, rank: i + 1, isPrimary: i === 0 };
        })
        .filter((l): l is NonNullable<typeof l> => l != null);
    },
  };

  return {
    ...mockServices,
    opportunity,
    launchGeneration: {
      async generate(mode, profile) {
        if (mode === 'money') return opportunity.rankForMoney(profile as never);
        return opportunity.rankForBusiness(profile as never);
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