import { StateStorage, createJSONStorage } from "zustand/middleware";
import type { StateCreator } from "zustand";
import { create as actualCreate } from "zustand";
import { MMKV } from "react-native-mmkv";
import { NativeModules } from "react-native";

// MMKV instance for Zustand stores
export const storage = new MMKV({
  id: "taykie-shared",
});

// Native token manager
const { TokenManager } = NativeModules;

// Helper functions for token management with native bridge
export const setTokenInNative = (token: string) => {
  if (TokenManager) {
    TokenManager.saveToken(token);
  } else {
    console.warn("⚠️ TokenManager not available - extension won't have token access");
  }
};

export const deleteTokenFromNative = () => {
  if (TokenManager) {
    TokenManager.removeToken();
  }
};

// Store reset functions registry
const storeResetFns = new Set<() => void>();

// MMKV storage adapter for Zustand StateStorage interface
const mmkvStateStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return storage.getString(name) ?? null;
    } catch (error) {
      console.warn(`Failed to get data for key "${name}":`, error);
      storage.delete(name);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      storage.set(name, value);
    } catch (error) {
      console.error(`Failed to store data for key "${name}":`, error);
    }
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};

// Ready-to-use JSON storage for Zustand persist middleware
export const mmkvJSONStateStorage = createJSONStorage(() => mmkvStateStorage);

// Clear all MMKV storage
export const clearAllStorage = () => {
  storage.clearAll();
};

// Reset all Zustand stores in-memory state (automatic)
export const resetAllStores = () => {
  storeResetFns.forEach((resetFn) => {
    resetFn();
  });
};

// Clear everything: persistent storage, in-memory state, and native tokens
export const clearEverything = () => {
  clearAllStorage();
  resetAllStores();
  deleteTokenFromNative();
};

// Custom create function that automatically registers stores for reset
export const create = (<T>() => {
  return (stateCreator: StateCreator<T>) => {
    const store = actualCreate(stateCreator);
    const initialState = store.getInitialState();
    storeResetFns.add(() => {
      store.setState(initialState, true);
    });
    return store;
  };
}) as typeof actualCreate;
