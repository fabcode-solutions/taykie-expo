import { create } from "zustand";

export interface LidPromptEvent {
  id: string;
  openedAt: string; // ISO
}

interface LidPromptState {
  // Only one at a time — a second fresh open arriving while the user is
  // already looking at a prompt just waits; it's still in the unconfirmed
  // list either way, so nothing is lost by not stacking modals.
  activeEvent: LidPromptEvent | null;
  show: (event: LidPromptEvent) => void;
  hide: () => void;
}

export const useLidPromptStore = create<LidPromptState>((set, get) => ({
  activeEvent: null,
  show: (event) => {
    if (get().activeEvent) return; // something's already showing
    set({ activeEvent: event });
  },
  hide: () => set({ activeEvent: null }),
}));
