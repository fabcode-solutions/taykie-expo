import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mmkvJSONStateStorage } from "./stateStorage";
import { getErrorMessage } from "./postStore";
import {
  completeOnboarding,
  getOnboardingStatus,
  resetOnboarding,
  saveOnboarding,
} from "@/services/api/auth";
import { omitNullUndefined } from "@/utils/formatter";
import { getDeviceTimezone } from "@/utils/timezone";
import { useAuthStore } from "./authStore";

export interface SupplementItem {
  name: string;
  dose: string;
}

export interface SupplementSlot {
  slot: string; // "morning", "evening", etc.
  scheduleTime: string; // Display label
  items: SupplementItem[];
}

export interface OtherSupplement {
  name: string;
  dose: string;
  reminder_slots: string[]; // e.g., ["morning"]
  restock_reminder: boolean;
  restock_lead_days: number; // days before refill reminder
}

export interface OnboardRequest {
  user_country?: string; // e.g., "AU"
  user_language?: string; // e.g., "en-AU"
  user_timezone?: string; // IANA zone, e.g. "Australia/Sydney"
  devicePaired?: boolean;
  pairedDeviceName?: string | null;

  dose_frequency?: number; // number of doses per day
  dose_times?: string[]; // e.g., ["08:00", "20:00"]

  supplements?: SupplementSlot[];
  other_supplements?: OtherSupplement[];

  refill_day?: string[]; // e.g., ["sunday"]
  refill_time?: string; // e.g., "08:00"

  reminder_sound?: boolean;
  reminder_sound_name?: string;
  reminder_light?: boolean;
  reminder_push?: boolean;

  lock_screen_reminders?: boolean;

  baseline_adherence_score?: number; // optional initial adherence score

  coaching_enabled?: boolean;

  lastCompletedStep?: number;
}

export interface OnboardingDataResponse {
  id: string;
  userId: string;
  userCountry?: string | null;
  userLanguage?: string | null;
  devicePaired: boolean;
  pairedDeviceName?: string | null;

  doseFrequency?: number | null;
  doseTimes: string[]; // e.g., ["08:00", "20:00"]
  supplements: SupplementSlot[];
  otherSupplements: OtherSupplement[];

  refillDay: string[];
  refillTime?: string | null;

  reminderSound: boolean;
  reminderSoundName?: string;
  reminderLight: boolean;
  reminderPush: boolean;
  lockScreenReminders: boolean;

  baselineAdherenceScore?: number | null;
  coachingEnabled: boolean;
  lastCompletedStep?: number;

  isOnboardingComplete: boolean;
  completedAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

type State = {
  // Step tracking
  currentStep: number;
  totalSteps: number;
  isOnboardingComplete: boolean;
  pairedDeviceName?: string | null;
  // Screen 2 — Country & Language
  user_country: string;
  user_language: string;
  user_timezone: string;

  // Screen 5 — Dosage Frequency
  dose_frequency: 1 | 2 | 3;
  dose_times: string[]; // ["08:00"] or ["08:00","20:00"] or ["08:00","13:00","20:00"]

  // Screen 6 — Taykie Supplements
  supplements: SupplementSlot[];

  // Screen 7 — Other Supplements
  other_supplements: OtherSupplement[];

  // Screen 8 — Refill Reminder
  refill_day: string[];
  refill_time: string;

  // Screen 9 — Reminder Style
  reminder_sound: boolean;
  reminder_sound_name: string;
  reminder_light: boolean;
  reminder_push: boolean;

  // Screen 10 — Lock Screen
  lock_screen_reminders: boolean;

  // Screen 11 — Baseline Check-In
  baseline_adherence_score: number | null;

  // Screen 12 — Coaching Opt-In
  coaching_enabled: boolean;
  isLoading: boolean;
  error: string | null;
};

type Actions = {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setCountryLanguage: (country: string, language: string) => void;
  setTimezone: (timezone: string) => void;
  setPairedDeviceName: (name: string | null) => void;
  setDoseFrequency: (freq: 1 | 2 | 3, times: string[]) => void;
  setSupplements: (supplements: SupplementSlot[]) => void;
  setOtherSupplements: (items: OtherSupplement[]) => void;
  setRefillReminder: (days: string[], time: string) => void;
  setReminderStyle: (sound: boolean, soundName: string, light: boolean, push: boolean) => void;
  setLockScreen: (enabled: boolean) => void;
  setBaselineScore: (score: number | null) => void;
  setCoachingEnabled: (enabled: boolean) => void;
  completeOnboarding: () => Promise<void>;
  saveboardingDetails: () => Promise<void>;
  fetchOnboardingStatus: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const DEFAULT_SLOT_LABELS: Record<number, string[]> = {
  1: ["Morning"],
  2: ["Morning", "Evening"],
  3: ["Morning", "Midday", "Evening"],
};

const buildDefaultSupplements = (freq: 1 | 2 | 3): SupplementSlot[] => {
  const labels = DEFAULT_SLOT_LABELS[freq];
  return labels.map((label, i) => ({
    slot: label.toLowerCase(),
    scheduleTime: "",
    items: [{ name: "", dose: "" }],
  }));
};
const initialState: State = {
  currentStep: 1,
  totalSteps: 10,
  isOnboardingComplete: false,
  user_country: "AU",
  user_language: "en-AU",
  // Pre-filled from the device so the onboarding screen shows a sensible
  // selection immediately rather than an empty picker — the user can still
  // override it there before continuing.
  user_timezone:  "Australia/Sydney",// getDeviceTimezone() ??,
  dose_frequency: 1,
  dose_times: ["08:00"],
  supplements: buildDefaultSupplements(1),
  other_supplements: [],
  refill_day: ["sunday"],
  refill_time: "08:00",
  reminder_sound: true,
  reminder_sound_name: "gentle_chime",
  reminder_light: true,
  reminder_push: true,
  lock_screen_reminders: false,
  baseline_adherence_score: null,
  coaching_enabled: true,
  isLoading: false,
  error: null,
};

const mapResponseToState = (data: any): Partial<State> => ({
  currentStep: data.lastCompletedStep ?? 1,
  isOnboardingComplete: data.isOnboardingComplete,

  user_country: data.user_country ?? "AU",
  user_language: data.user_language ?? "en-AU",
  user_timezone: data.user_timezone ?? getDeviceTimezone() ?? "Australia/Sydney",

  dose_frequency: Number(data.dose_frequency ?? 1) as 1 | 2 | 3,

  dose_times: data.dose_times?.length > 0 ? data.dose_times : ["08:00"],

  supplements: data.supplements?.length
    ? data.supplements.map((s: any) => ({
        slot: s.slot,
        scheduleTime: s.scheduleTime ?? "",
        items: s.items ?? [{ name: "", dose: "" }],
      }))
    : buildDefaultSupplements(Number(data.dose_frequency ?? 1) as 1 | 2 | 3),
  other_supplements: data.other_supplements ?? [],

  refill_day: data.refill_day?.length ? data.refill_day : ["sunday"],

  refill_time: data.refill_time ?? "08:00",

  reminder_sound: data.reminder_sound,
  reminder_sound_name: data.reminder_sound_name ?? "gentle_chime",
  reminder_light: data.reminder_light,
  reminder_push: data.reminder_push,

  lock_screen_reminders: data.lock_screen_reminders,

  baseline_adherence_score: data.baseline_adherence_score ?? null,
  coaching_enabled: data.coaching_enabled,
});

const cleanSupplements = (supplements: SupplementSlot[]): SupplementSlot[] => {
  return supplements
    .map((slot) => ({
      ...slot,
      items: slot.items.filter((item) => item.name && item.name.trim() !== ""),
    }))
    .filter((slot) => slot.items.length > 0);
};
// Helper to build OnboardRequest from store state
const buildOnboardRequestFromStore = (state: State): OnboardRequest => {
  const cleanedSupplements = cleanSupplements(state.supplements);

  const request: OnboardRequest = {
    user_country: state.user_country,
    user_language: state.user_language,
    user_timezone: state.user_timezone,
    devicePaired: false,
    pairedDeviceName: state.pairedDeviceName ?? null,

    dose_frequency: state.dose_frequency,
    dose_times: state.dose_times,

    ...(cleanedSupplements.length > 0 && {
      supplements: cleanedSupplements, // ✅ only added if valid
    }),
    other_supplements: state.other_supplements,

    refill_day: state.refill_day,
    refill_time: state.refill_time,

    reminder_sound: state.reminder_sound,
    reminder_sound_name: state.reminder_sound_name,
    reminder_light: state.reminder_light,
    reminder_push: state.reminder_push,

    lock_screen_reminders: state.lock_screen_reminders,

    baseline_adherence_score: state.baseline_adherence_score,
    coaching_enabled: state.coaching_enabled,
    lastCompletedStep: state.currentStep,
  };

  // Automatically remove all undefined values
  return omitNullUndefined(request);
};

export const useOnboardingStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, s.totalSteps) })),
      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

      setCountryLanguage: (country, language) =>
        set({ user_country: country, user_language: language }),
      setTimezone: (timezone) => set({ user_timezone: timezone }),

      setDoseFrequency: (freq, times) =>
        set({
          dose_frequency: freq,
          dose_times: times,
          supplements: buildDefaultSupplements(freq),
        }),

      setSupplements: (supplements) => set({ supplements }),

      setOtherSupplements: (items) => set({ other_supplements: items }),

      setRefillReminder: (days, time) => set({ refill_day: days, refill_time: time }),

      setReminderStyle: (sound, soundName, light, push) =>
        set({
          reminder_sound: sound,
          reminder_sound_name: soundName,
          reminder_light: light,
          reminder_push: push,
        }),

      setLockScreen: (enabled) => set({ lock_screen_reminders: enabled }),

      setBaselineScore: (score) => set({ baseline_adherence_score: score }),

      setCoachingEnabled: (enabled) => set({ coaching_enabled: enabled }),
      setPairedDeviceName: (name) => set({ pairedDeviceName: name }),
      completeOnboarding: async () => {
        set({ isLoading: true, error: null });
        try {
          await completeOnboarding();

          await get().fetchOnboardingStatus();
          set({ isLoading: false, currentStep: 10 });
        } catch (error) {
          const message = getErrorMessage(error, "Complete Onboarding failed");
          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      fetchOnboardingStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getOnboardingStatus();
          const data: OnboardingDataResponse = response.data;
          // Save API response into store

          if (data.isOnboardingComplete) {
            set({
              ...mapResponseToState(data),
            });
          }
          set({ isLoading: false });
        } catch (error) {
          const message = getErrorMessage(error, "Fetch Onboarding failed");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },
      saveboardingDetails: async () => {
        set({ isLoading: true, error: null });
        try {
          // Build request from store state
          const request: OnboardRequest = buildOnboardRequestFromStore(get());
          // Send to API
          await saveOnboarding(request);
          await get().completeOnboarding();
          await useAuthStore.getState().fetchUserProfile();
          set({
            isLoading: false,
          });
        } catch (error) {
          const message = getErrorMessage(error, "Save Onboarding failed");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },
      resetOnboarding: async () => {
        set({ isLoading: true, error: null });
        try {
          // Send to API
          await resetOnboarding();
          // Update store
          await get().fetchOnboardingStatus();
        } catch (error) {
          const message = getErrorMessage(error, "Save Onboarding failed");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },
    }),
    {
      name: "onboarding-store",
      storage: mmkvJSONStateStorage,

      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    },
  ),
);
