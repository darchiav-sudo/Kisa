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

  setHydrated: (v: boolean) => void;
  setUser: (user: UserProfile) => void;
  setIntake: (intake: Intake) => void;
  setPendingIdea: (idea: Idea | null) => void;
  setBusiness: (business: Business | null) => void;
  signOut: () => void;
}

const initial = {
  hydrated: false,
  user: null as UserProfile | null,
  intake: null as Intake | null,
  pendingIdea: null as Idea | null,
  business: null as Business | null,
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
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);