import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Business, Idea, Intake, UserProfile } from '@/src/models/types';

const STORAGE_KEY = 'kisa-v2';

interface AppState {
  hydrated: boolean;
  user: UserProfile | null;
  intake: Intake | null;
  /** Idea the user accepted, waiting to be built. */
  pendingIdea: Idea | null;
  /** Last known copy of the active business, for instant display. */
  business: Business | null;
  /** When the owner last opened Kisa's activity, per business; newer events count as unread. */
  activitySeen: Record<string, string>;

  setHydrated: (v: boolean) => void;
  setUser: (user: UserProfile) => void;
  setIntake: (intake: Intake) => void;
  setPendingIdea: (idea: Idea | null) => void;
  setBusiness: (business: Business | null) => void;
  markActivitySeen: (businessId: string) => void;
  signOut: () => void;
}

const initial = {
  hydrated: false,
  user: null as UserProfile | null,
  intake: null as Intake | null,
  pendingIdea: null as Idea | null,
  business: null as Business | null,
  activitySeen: {} as Record<string, string>,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      setHydrated: (v) => set({ hydrated: v }),
      setUser: (user) => set({ user }),
      setIntake: (intake) => set({ intake }),
      setPendingIdea: (pendingIdea) => set({ pendingIdea }),
      setBusiness: (business) => set({ business }),
      markActivitySeen: (businessId) =>
        set((s) => ({ activitySeen: { ...s.activitySeen, [businessId]: new Date().toISOString() } })),
      signOut: () => set({ ...initial, hydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        intake: state.intake,
        pendingIdea: state.pendingIdea,
        business: state.business,
        activitySeen: state.activitySeen,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Unread counts behind the ⋯ menu: new orders and Kisa's activity since it was last opened. */
export function useUpdates() {
  const business = useAppStore((s) => s.business);
  const seen = useAppStore((s) => (s.business ? s.activitySeen[s.business.id] : undefined));
  if (!business) return { leads: 0, activity: 0, total: 0 };
  const leads = business.leads.filter((l) => l.status === 'new').length;
  const since = seen ? new Date(seen).getTime() : Date.now() - 24 * 60 * 60 * 1000;
  const activity = (business.agentLog ?? []).filter((e) => new Date(e.createdAt).getTime() > since).length;
  return { leads, activity, total: leads + activity };
}
