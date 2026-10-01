import { persist } from "zustand/middleware";
import { create, mmkvJSONStateStorage } from "./stateStorage";

// "Skip for now" follow-up prompts (Device Registration brief, Scenario 3):
//   - after 48 hours, show a soft in-app nudge;
//   - after two prompts, stop asking.
// The second prompt is also spaced 48 hours after the first (the brief doesn't say).
export const NUDGE_DELAY_MS = 48 * 60 * 60 * 1000;
export const MAX_NUDGES = 2;

type State = {
  /** When the user tapped "Skip for now" (epoch ms); null = never skipped. */
  skippedAt: number | null;
  nudgeCount: number;
  lastNudgeAt: number | null;
};

type Actions = {
  /** Called when the registration screen is skipped. Only the FIRST skip starts the clock. */
  markSkipped: () => void;
  recordNudgeShown: () => void;
};

const initialState: State = { skippedAt: null, nudgeCount: 0, lastNudgeAt: null };

// Persisted per device and cleared on logout (resetAllStores) — a nudge belongs to the
// account that skipped, not whoever logs in next.
export const useRegistrationNudgeStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,
      markSkipped: () => {
        if (get().skippedAt === null) set({ skippedAt: Date.now() });
      },
      recordNudgeShown: () =>
        set((s) => ({ nudgeCount: s.nudgeCount + 1, lastNudgeAt: Date.now() })),
    }),
    { name: "registration-nudge-store", storage: mmkvJSONStateStorage },
  ),
);

export const isNudgeDue = (state: State, now: number = Date.now()): boolean => {
  if (state.skippedAt === null || state.nudgeCount >= MAX_NUDGES) return false;
  return now - (state.lastNudgeAt ?? state.skippedAt) >= NUDGE_DELAY_MS;
};
