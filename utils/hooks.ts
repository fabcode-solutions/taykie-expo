import { useState, useEffect, useRef, useCallback } from "react";
import { Keyboard, AppState, View, NativeModules } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { ActionMenuItem, ActionMenuPosition } from "@/components/shared/menu/ReusableActionMenu";
import { useTranslation } from "react-i18next";

const { TokenManager } = NativeModules;

/**
 * Custom hook for keyboard visibility
 */
export const useKeyboard = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
};

/**
 * Custom hook for debouncing a value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for network status
 */
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected };
};

/**
 * Custom hook for app state (foreground, background)
 */
export const useAppState = () => {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return appStateVisible;
};

/**
 * Hook for managing action menu state and positioning
 */
export const useActionMenu = () => {
  // Visibility state
  const [isVisible, setIsVisible] = useState(false);

  // Menu items
  const [menuItems, setMenuItems] = useState<ActionMenuItem[]>([]);

  // Position configuration
  const [position, setPosition] = useState<ActionMenuPosition>({});

  // Optional title
  const [title, setTitle] = useState<string | undefined>();

  // Reference to target element that triggers the menu
  const targetRef = useRef<View | null>(null);

  // Custom width for menu
  const [width, setWidth] = useState<number | string>(240);

  // Show the menu at a specific position
  const showMenu = useCallback(
    (
      items: ActionMenuItem[],
      menuPosition?: ActionMenuPosition,
      menuTitle?: string,
      menuWidth?: number | string,
    ) => {
      setMenuItems(items);

      if (menuPosition) {
        setPosition(menuPosition);
      }

      if (menuTitle) {
        setTitle(menuTitle);
      }

      if (menuWidth) {
        setWidth(menuWidth);
      }

      setIsVisible(true);
    },
    [],
  );

  // Show menu at current pointer position (e.g., from touchable event)
  const showMenuAtPosition = useCallback(
    (
      items: ActionMenuItem[],
      x: number,
      y: number,
      menuTitle?: string,
      align?: "start" | "center" | "end",
      menuWidth?: number | string,
    ) => {
      showMenu(items, { x, y, align }, menuTitle, menuWidth);
    },
    [showMenu],
  );

  // Show menu at the position of the ref element
  const showMenuFromRef = useCallback(
    (
      items: ActionMenuItem[],
      menuTitle?: string,
      position?: "top" | "bottom" | "left" | "right" | "center",
      align?: "start" | "center" | "end",
      menuWidth?: number | string,
    ) => {
      if (!targetRef.current) {
        console.warn("No target ref provided to useActionMenu");
        return;
      }

      targetRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        showMenu(
          items,
          {
            x: pageX,
            y: pageY,
            width,
            height,
            position,
            align,
          },
          menuTitle,
          menuWidth,
        );
      });
    },
    [showMenu, targetRef],
  );

  // Hide the menu
  const hideMenu = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Helper for showing menu from a button or any element with position data
  const showMenuFromEvent = useCallback(
    (
      event: any,
      items: ActionMenuItem[],
      menuTitle?: string,
      position?: "top" | "bottom" | "left" | "right" | "center",
      align?: "start" | "center" | "end",
      menuWidth?: number | string,
    ) => {
      const { pageX, pageY } = event.nativeEvent;

      // For elements like buttons that have position data in nativeEvent.layout
      let width = 0;
      let height = 0;

      if (event.nativeEvent.layout) {
        width = event.nativeEvent.layout.width;
        height = event.nativeEvent.layout.height;
      }

      showMenu(
        items,
        {
          x: pageX,
          y: pageY,
          width,
          height,
          position,
          align,
        },
        menuTitle,
        menuWidth,
      );
    },
    [showMenu],
  );

  return {
    isVisible,
    menuItems,
    position,
    title,
    width,
    targetRef,
    showMenu,
    showMenuAtPosition,
    showMenuFromRef,
    showMenuFromEvent,
    hideMenu,
  };
};

/**
 * Hook to pass the translation Native
 */
export const usePassTranslationsToNative = () => {
  const { t } = useTranslation();

  useEffect(() => {
    if (TokenManager) {
      const savedStr = t("common.saved");
      const savingStr = t("common.saving");

      TokenManager.saveTranslation("taykie_share_t_common_saved", savedStr);
      TokenManager.saveTranslation("taykie_share_t_common_saving", savingStr);
    } else {
      console.warn("⚠️ TokenManager not available - extension won't have translation");
    }
  }, [t]);
};

/**
 * Returns a stable bottom padding for ScrollView content to avoid
 * being hidden by the bottom tab bar and the safe area on iOS.
 *
 * @param extra Extra pixels beyond the safe area bottom (default 80)
 */
export const useBottomContentPadding = (extra: number = 80): number => {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
};
