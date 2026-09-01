import { useState, useCallback } from "react";

export interface UseBottomDrawerReturn {
  /** Whether the drawer is currently visible */
  isVisible: boolean;

  /** Open the drawer */
  open: () => void;

  /** Close the drawer */
  close: () => void;

  /** Toggle the drawer visibility */
  toggle: () => void;
}

/**
 * Hook for managing bottom drawer state
 * Provides open, close, and toggle functions
 */
export const useBottomDrawer = (initialState = false): UseBottomDrawerReturn => {
  const [isVisible, setIsVisible] = useState(initialState);

  const open = useCallback(() => {
    setIsVisible(true);
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    open,
    close,
    toggle,
  };
};
