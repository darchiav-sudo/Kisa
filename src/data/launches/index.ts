import type { AppMode, Launch, MoneyProfile, BusinessProfile } from '@/src/models/types';
import { leafCleanupLaunch } from './leafCleanup';
import { booksLaunches } from './booksTbilisi';
import { phillyAltLaunches } from './phillyAlts';

const allLaunches: Launch[] = [leafCleanupLaunch, ...phillyAltLaunches, ...booksLaunches];

export function getLaunchById(id: string): Launch | undefined {
  return allLaunches.find((l) => l.id === id);
}

export function getAllLaunches(): Launch[] {
  return allLaunches;
}

/** Ranked launches for money mode based on a simple mocked profile match. */
export function getMoneyLaunches(_profile: MoneyProfile | null): Launch[] {
  return [leafCleanupLaunch, ...phillyAltLaunches].sort((a, b) => a.rank - b.rank);
}

/** Sales launches for business mode. */
export function getBusinessLaunches(_profile: BusinessProfile | null): Launch[] {
  return [...booksLaunches].sort((a, b) => a.rank - b.rank);
}

export function getLaunchesForMode(
  mode: AppMode,
  money: MoneyProfile | null,
  business: BusinessProfile | null,
): Launch[] {
  return mode === 'money' ? getMoneyLaunches(money) : getBusinessLaunches(business);
}

export { leafCleanupLaunch, booksLaunches, phillyAltLaunches };
