import type { ReactNode } from "react";
import type { TextStyle, ViewStyle } from "react-native";

export interface BottomDrawerProps {
  /** Whether the drawer is visible */
  isVisible: boolean;

  /** Callback when drawer is closed */
  onClose: () => void;

  /** Content to render inside the drawer */
  children: ReactNode;

  /** Title to display at the top of the drawer */
  title?: string;

  /** Height of the drawer (percentage or number) */
  height?: number | string;

  /** Whether to show the drag handle */
  showHandle?: boolean;

  /** Whether the drawer can be closed by tapping the backdrop */
  closeOnBackdropPress?: boolean;

  /** Whether the drawer can be closed by swiping down */
  closeOnSwipeDown?: boolean;

  /** Custom styles for the drawer container */
  containerStyle?: ViewStyle;
  headingStyle?: TextStyle;

  /** Custom styles for the content area */
  contentStyle?: ViewStyle;

  /** Blur intensity for backdrop (0-100) */
  backdropBlurIntensity?: number;

  /** Blur intensity for drawer (0-100) */
  drawerBlurIntensity?: number;

  /** Enable blur on drawer background */
  enableDrawerBlur?: boolean;

  /** Callback when drawer animation starts */
  onAnimationStart?: () => void;

  /** Callback when drawer animation completes */
  onAnimationComplete?: () => void;
}

export interface BottomDrawerMethods {
  /** Programmatically open the drawer */
  open: () => void;

  /** Programmatically close the drawer */
  close: () => void;

  /** Check if drawer is currently open */
  isOpen: () => boolean;
}
