import { router } from 'expo-router';

import type { IdeaMode } from '@/src/lib/business';

/** Opens the idea tab and starts a fresh search. From a stacked screen it closes back down to the tabs. */
export function findIdeaNow(mode: IdeaMode = 'hands-on', fromStack = false) {
  const href = { pathname: '/idea' as const, params: { run: String(Date.now()), mode } };
  if (fromStack) router.dismissTo(href);
  else router.navigate(href);
}
