import { persist } from "zustand/middleware";
import { create } from "zustand";
import { mmkvJSONStateStorage } from "./stateStorage";
import {
  getDataToExport,
  getUserInsights,
  getUserInsightsByDate,
  getUserInsightsInRange,
  InsightPeriod,
} from "@/services/api/insight";
import { getErrorMessage } from "./postStore";

// ─── Types matching the real API response ─────────────────────────────────────

export interface InsightSummary {
  percentTakenOnTime: number;
  currentStreak: number;
  missedDoses: number;
}

export interface DayPeriodBreakdown {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface MissedDayData {
  date: string;
  dayLabel: string;
  dayName: string;
  dayOfWeek: number;
  total: number;
  byPeriod: DayPeriodBreakdown;
  dominantPeriod: keyof DayPeriodBreakdown;
}

export interface TimeOfDayMissed {
  days: MissedDayData[];
  mostMissedPeriod: string;
  mostMissedHour: string;
}

export interface AdherenceDataPoint {
  label: string;
  taken: number;
  missed: number;
  total: number;
  takenRate: number;
  missedRate: number;
}

export interface AdherenceOverTime {
  view: string;
  data: AdherenceDataPoint[];
}

export interface SuggestedAdjustment {
  type: string;
  title: string;
  suggestion: string;
}

export interface InsightData {
  summary: InsightSummary;
  timeOfDayMissed: TimeOfDayMissed;
  adherenceOverTime: AdherenceOverTime;
  suggestedAdjustments: SuggestedAdjustment[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

type State = {
  userInsights: InsightData | null;
  isLoading: boolean;
  error: string | null;
};

type Actions = {
  fetchUserInsights: (period: InsightPeriod) => Promise<void>;
  fetchUserInsightsInRange: (from: string, to: string) => Promise<void>;
  fetchUserInsightsByDate: (date: string) => Promise<void>;
  fetchDataToExport: () => Promise<any>;
  clearError: () => void;
};

const initialState: State = {
  userInsights: null,
  isLoading: false,
  error: null,
};

export const useInsightStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initialState,

      fetchUserInsights: async (period) => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUserInsights(period);
          // API wraps data in response.data
          set({ isLoading: false, userInsights: response.data ?? response });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      fetchUserInsightsInRange: async (from, to) => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUserInsightsInRange(from, to);
          set({ isLoading: false, userInsights: response.data ?? response });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      fetchUserInsightsByDate: async (date) => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUserInsightsByDate(date);
          set({ isLoading: false, userInsights: response.data ?? response });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      fetchDataToExport: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getDataToExport();
          set({ isLoading: false });
          return response;
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "insight-store",
      storage: mmkvJSONStateStorage,
    },
  ),
);
