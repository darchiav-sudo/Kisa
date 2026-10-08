import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AppMode,
  BusinessProfile,
  EarningsEvent,
  LaunchProgress,
  MoneyProfile,
  UserProfile,
} from '@/src/models/types';

const STORAGE_KEY = 'kisa-money-launcher-v1';

interface AppState {
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
  lastLeadPreview: string | null;

  setHydrated: (v: boolean) => void;
  setMode: (mode: AppMode) => void;
  setMoneyProfile: (profile: MoneyProfile) => void;
  setBusinessProfile: (profile: BusinessProfile) => void;
  setUser: (user: UserProfile) => void;
  markAnalysis: () => void;
  startLaunch: (launchId: string) => void;
  completeStep: (launchId: string, stepId: string) => void;
  setStepIndex: (launchId: string, index: number) => void;
  markPublished: (launchId: string) => void;
  attachLead: (launchId: string, leadId: string, preview: string) => void;
  markBooked: (launchId: string) => void;
  addEarning: (event: Omit<EarningsEvent, 'id' | 'at'> & { id?: string; at?: string }) => void;
  completeLaunch: (launchId: string) => void;
  resetLaunchProgress: (launchId: string) => void;
  resetAll: () => void;
}

const initial = {
  hydrated: false,
  onboardingComplete: false,
  mode: null as AppMode | null,
  user: null as UserProfile | null,
  moneyProfile: null as MoneyProfile | null,
  businessProfile: null as BusinessProfile | null,
  activeLaunchId: null as string | null,
  progressByLaunchId: {} as Record<string, LaunchProgress>,
  earnings: [] as EarningsEvent[],
  lastAnalysisAt: null as string | null,
  lastLeadPreview: null as string | null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      setHydrated: (v) => set({ hydrated: v }),

      setMode: (mode) => set({ mode }),

      setMoneyProfile: (profile) =>
        set({
          moneyProfile: profile,
          mode: 'money',
          onboardingComplete: true,
        }),

      setBusinessProfile: (profile) =>
        set({
          businessProfile: profile,
          mode: 'business',
          onboardingComplete: true,
        }),

      setUser: (user) => set({ user }),

      markAnalysis: () => set({ lastAnalysisAt: new Date().toISOString() }),

      startLaunch: (launchId) => {
        const now = new Date().toISOString();
        const existing = get().progressByLaunchId[launchId];
        const progress: LaunchProgress =
          existing && existing.status === 'active'
            ? { ...existing, updatedAt: now }
            : {
                launchId,
                currentStepIndex: 0,
                completedStepIds: [],
                startedAt: now,
                updatedAt: now,
                status: 'active',
              };
        set({
          activeLaunchId: launchId,
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: progress,
          },
        });
      },

      completeStep: (launchId, stepId) => {
        const current = get().progressByLaunchId[launchId];
        if (!current) return;
        const completed = current.completedStepIds.includes(stepId)
          ? current.completedStepIds
          : [...current.completedStepIds, stepId];
        const nextIndex = current.currentStepIndex + 1;
        set({
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: {
              ...current,
              completedStepIds: completed,
              currentStepIndex: nextIndex,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      },

      setStepIndex: (launchId, index) => {
        const current = get().progressByLaunchId[launchId];
        if (!current) return;
        set({
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: {
              ...current,
              currentStepIndex: index,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      },

      markPublished: (launchId) => {
        const current = get().progressByLaunchId[launchId];
        if (!current) return;
        set({
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: { ...current, simulatedPublished: true, updatedAt: new Date().toISOString() },
          },
        });
      },

      attachLead: (launchId, leadId, preview) => {
        const current = get().progressByLaunchId[launchId];
        if (!current) return;
        set({
          lastLeadPreview: preview,
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: {
              ...current,
              leadId,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      },

      markBooked: (launchId) => {
        const current = get().progressByLaunchId[launchId];
        if (!current) return;
        set({
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: { ...current, booked: true, updatedAt: new Date().toISOString() },
          },
        });
      },

      addEarning: (event) => {
        const entry: EarningsEvent = {
          id: event.id ?? `earn_${Date.now()}`,
          launchId: event.launchId,
          amount: event.amount,
          currency: event.currency,
          label: event.label,
          at: event.at ?? new Date().toISOString(),
        };
        set({ earnings: [entry, ...get().earnings] });
      },

      completeLaunch: (launchId) => {
        const current = get().progressByLaunchId[launchId];
        if (!current) return;
        set({
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: {
              ...current,
              status: 'completed',
              updatedAt: new Date().toISOString(),
            },
          },
        });
      },

      resetLaunchProgress: (launchId) => {
        const now = new Date().toISOString();
        set({
          activeLaunchId: launchId,
          progressByLaunchId: {
            ...get().progressByLaunchId,
            [launchId]: {
              launchId,
              currentStepIndex: 0,
              completedStepIds: [],
              startedAt: now,
              updatedAt: now,
              status: 'active',
            },
          },
        });
      },

      resetAll: () => set({ ...initial, hydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        mode: state.mode,
        user: state.user,
        moneyProfile: state.moneyProfile,
        businessProfile: state.businessProfile,
        activeLaunchId: state.activeLaunchId,
        progressByLaunchId: state.progressByLaunchId,
        earnings: state.earnings,
        lastAnalysisAt: state.lastAnalysisAt,
        lastLeadPreview: state.lastLeadPreview,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function selectTotalEarnings(currency: 'USD' | 'GEL', earnings: EarningsEvent[]) {
  return earnings
    .filter((e) => e.currency === currency)
    .reduce((sum, e) => sum + e.amount, 0);
}
