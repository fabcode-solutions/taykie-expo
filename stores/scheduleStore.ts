import { persist } from "zustand/middleware";
import {
  CreateScheduleRequest,
  LogsData,
  Schedule,
  UpcomingReminderData,
} from "@/types/schedule.types";
import {
  createSchedule,
  createSnooze,
  deleteSchedule,
  getTodaySchedules,
  getUpcomingReminder,
  getUserSchedules,
  getUserStreak,
  markAsTaken,
  updateSchedule,
} from "@/hooks/queries/schedule";
import { create } from "zustand";
import { mmkvJSONStateStorage } from "./stateStorage";
import { getErrorMessage } from "./postStore";
import { useAuthStore } from "./authStore";
import { deleteLog, getUserLogs } from "@/hooks/queries/products";

type State = {
  userSchedules: Schedule[];
  todaySchedules: Schedule[];
  upcomingReminder: UpcomingReminderData | null;
  userLogs: LogsData[];
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  isFetchingNextPage: boolean;
};

type Actions = {
  createSchedule: (requestBody: CreateScheduleRequest) => Promise<void>;
  fetchUserSchedules: (reset?: boolean) => Promise<void>;
  fetchTodaySchedules: () => Promise<void>;
  deleteSchedule: (scheduleId: string) => Promise<string>;
  updateUserSchedule: (
    scheduleId: string,
    updateRequest: CreateScheduleRequest,
  ) => Promise<{ message: string; data: Schedule }>;
  markMedicineAsTaken: (scheduleId: string) => Promise<string>;
  fetchSchedules: (reset?: boolean) => Promise<void>;
  fetchUpcomingReminder: () => Promise<void>;
  fetchUserStreak: () => Promise<void>;
  createSnoozeForSchedule: (scheduleId: string, duration: number) => Promise<string>;
  fetchUserLogs: () => Promise<void>;
  deleteUserLog: (logId: string) => Promise<string>;
  clearError: () => void;
};

const initialState: State = {
  userSchedules: [],
  todaySchedules: [],
  isLoading: false,
  error: null,
  userLogs: [],
  upcomingReminder: null,
  page: 1,
  hasMore: true,
  isFetchingNextPage: false,
};

// API base URL now handled by the shared api client + endpoints

export const useScheduleStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      createSchedule: async (requestBody) => {
        set({ isLoading: true, error: null });
        try {
          await createSchedule(requestBody);
          await get().fetchSchedules(true);
          await get().fetchUpcomingReminder();
          set({ isLoading: false });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Create Schedule failed",
          });
          throw Error(message);
        }
      },
      fetchUserSchedules: async (reset = false) => {
        const { page, isFetchingNextPage, hasMore } = get();
        if (isFetchingNextPage || (!reset && !hasMore)) return;

        const targetPage = reset ? 1 : page;

        if (reset) {
          set({
            userSchedules: [],
            page: 1,
            hasMore: true,
            isLoading: true,
            error: null,
          });
        } else {
          set({ isFetchingNextPage: true, error: null });
        }

        try {
          const result = await getUserSchedules(targetPage);

          const newSchedules = result?.data || [];
          const totalPages = result?.meta?.totalPages || 1;

          set((state) => ({
            userSchedules: reset ? newSchedules : [...state.userSchedules, ...newSchedules],

            page: targetPage + 1,
            hasMore: targetPage < totalPages,

            isLoading: false,
            isFetchingNextPage: false,
          }));
        } catch (error) {
          const message = getErrorMessage(error);

          set({
            isLoading: false,
            isFetchingNextPage: false,
            error: error instanceof Error ? error.message : "Fetch User Schedules failed",
          });

          throw Error(message);
        }
      },

      fetchTodaySchedules: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await getTodaySchedules();
          set({ isLoading: false, todaySchedules: result.data });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetch Today's Schedule failed",
          });
          throw Error(message);
        }
      },

      deleteSchedule: async (scheduleTd) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deleteSchedule(scheduleTd);
          await get().fetchSchedules(true);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Delete Schedule failed",
          });
          throw Error(message);
        }
      },

      updateUserSchedule: async (scheduleId, request) => {
        set({ isLoading: true, error: null });
        try {
          const response = await updateSchedule(scheduleId, request);
          await get().fetchSchedules(true);
          await get().fetchUpcomingReminder();

          set({ isLoading: false });

          return {
            message: response.message,
            data: response.data,
          };
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Update Schedule failed",
          });
          throw Error(message);
        }
      },
      markMedicineAsTaken: async (scheduleId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await markAsTaken(scheduleId);
          await get().fetchSchedules(true);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Mark Medicine as Taken failed",
          });
          throw Error(message);
        }
      },

      fetchSchedules: async (reset = false) => {
        try {
          await get().fetchUserSchedules(reset);
          await get().fetchTodaySchedules();
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetching Schedules failed",
          });
          throw Error(message);
        }
      },
      fetchUpcomingReminder: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUpcomingReminder();
          set({ isLoading: false, upcomingReminder: response.data });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetching Upcoming Reminder failed",
          });
          throw Error(message);
        }
      },
      fetchUserStreak: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUserStreak();
          useAuthStore.setState((state) => ({
            ...state,
            userStreak: response.data,
          }));

          set({ isLoading: false });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetching User Streak failed",
          });
          throw Error(message);
        }
      },
      createSnoozeForSchedule: async (scheduleId, duration) => {
        set({ isLoading: true, error: null });
        try {
          const response = await createSnooze(scheduleId, duration);
          set({
            isLoading: false,
          });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Create Snooze failed",
          });
          throw Error(message);
        }
      },
      fetchUserLogs: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getUserLogs();
          set({ isLoading: false, userLogs: response.data });
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Fetching User Logs failed",
          });
          throw Error(message);
        }
      },
      deleteUserLog: async (logId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deleteLog(logId);
          await get().fetchUserLogs();
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Delete Log failed",
          });
          throw Error(message);
        }
      },
      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: "schedule-store",
      storage: mmkvJSONStateStorage,
    },
  ),
);
