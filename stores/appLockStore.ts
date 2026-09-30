import { persist } from "zustand/middleware";
import type * as LocalAuthenticationType from "expo-local-authentication";
import { create, mmkvJSONStateStorage } from "./stateStorage";

// Loaded lazily: a dev client built before expo-local-authentication was added
// doesn't contain the native module, and a top-level import would crash the
// whole app at startup. Without it, App Lock simply reports "no-hardware".
let localAuth: typeof LocalAuthenticationType | null | undefined;
const getLocalAuth = (): typeof LocalAuthenticationType | null => {
  if (localAuth === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      localAuth = require("expo-local-authentication");
    } catch (error) {
      console.warn("expo-local-authentication is not available in this build:", error);
      localAuth = null;
    }
  }
  return localAuth ?? null;
};

export type BiometricSupport = "available" | "no-hardware" | "not-enrolled";

type State = {
  // Persisted, per device: the lock is never synced to the backend because
  // biometrics are enrolled on (and only meaningful for) this phone.
  enabled: boolean;
  // In-memory only: starts locked on a cold launch when `enabled` is true.
  isLocked: boolean;
};

type Actions = {
  getBiometricSupport: () => Promise<BiometricSupport>;
  authenticate: (promptMessage: string, cancelLabel: string) => Promise<boolean>;
  // Turns the lock on only after a successful biometric/passcode check.
  enable: (promptMessage: string, cancelLabel: string) => Promise<boolean>;
  disable: () => void;
  lock: () => void;
  unlock: () => void;
};

export const useAppLockStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      enabled: false,
      isLocked: false,

      getBiometricSupport: async () => {
        const LocalAuthentication = getLocalAuth();
        if (!LocalAuthentication) return "no-hardware";
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return "no-hardware";
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return enrolled ? "available" : "not-enrolled";
      },

      authenticate: async (promptMessage, cancelLabel) => {
        const LocalAuthentication = getLocalAuth();
        if (!LocalAuthentication) return false;
        try {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            cancelLabel,
            // Lets the user fall back to the device passcode if biometrics fail.
            disableDeviceFallback: false,
          });
          return result.success;
        } catch (error) {
          console.warn("Biometric authentication failed:", error);
          return false;
        }
      },

      enable: async (promptMessage, cancelLabel) => {
        const ok = await get().authenticate(promptMessage, cancelLabel);
        if (ok) set({ enabled: true, isLocked: false });
        return ok;
      },

      disable: () => set({ enabled: false, isLocked: false }),
      lock: () => {
        if (get().enabled) set({ isLocked: true });
      },
      unlock: () => set({ isLocked: false }),
    }),
    {
      name: "app-lock-store",
      storage: mmkvJSONStateStorage,
      partialize: (state) => ({ enabled: state.enabled }),
      // A persisted "enabled" means the app must start locked.
      onRehydrateStorage: () => (state) => {
        if (state?.enabled) state.lock();
      },
    },
  ),
);
