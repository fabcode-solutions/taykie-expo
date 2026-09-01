import { create } from "zustand";

interface BannerState {
  message: any | null;
  isVisible: boolean;
  showBanner: (message: any) => void;
  hideBanner: () => void;
}

export const useBannerStore = create<BannerState>((set) => ({
  message: null,
  isVisible: false,
  showBanner: (message) => set({ message, isVisible: true }),
  hideBanner: () => set({ isVisible: false }),
}));