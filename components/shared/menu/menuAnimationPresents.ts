import { ActionMenuPosition } from "./ReusableActionMenu";

/**
 * Animation presets for menu appearance and behavior
 */
export const menuAnimationPresets = {
  /**
   * Default animation preset - balanced for most use cases
   * - Medium duration
   * - Moderate bounce effect
   */
  default: {
    duration: 200,
    closeDelay: 150,
    bounceIntensity: 1.5,
    scaleFrom: 0.8,
    translateY: 10,
  },

  /**
   * Fast animation preset - for quick interactions
   * - Short duration
   * - Minimal bounce effect
   */
  fast: {
    duration: 150,
    closeDelay: 120,
    bounceIntensity: 1.2,
    scaleFrom: 0.9,
    translateY: 5,
  },

  /**
   * Smooth animation preset - for elegant transitions
   * - Longer duration
   * - Subtle bounce effect
   */
  smooth: {
    duration: 250,
    closeDelay: 200,
    bounceIntensity: 1.3,
    scaleFrom: 0.85,
    translateY: 15,
  },

  /**
   * Bouncy animation preset - for playful interactions
   * - Medium duration
   * - Prominent bounce effect
   */
  bouncy: {
    duration: 300,
    closeDelay: 200,
    bounceIntensity: 1.2,
    scaleFrom: 0.8,
    translateY: 10,
  },
};

/**
 * Position presets for commonly used menu positions
 */
export const menuPositionPresets = {
  /**
   * Bottom-right position relative to the anchor
   */
  bottomRight: {
    position: "bottom" as const,
    align: "end" as const,
  },

  /**
   * Bottom-left position relative to the anchor
   */
  bottomLeft: {
    position: "bottom" as const,
    align: "start" as const,
  },

  /**
   * Top-right position relative to the anchor
   */
  topRight: {
    position: "top" as const,
    align: "end" as const,
  },

  /**
   * Top-left position relative to the anchor
   */
  topLeft: {
    position: "top" as const,
    align: "start" as const,
  },

  /**
   * Centered below the anchor
   */
  bottomCenter: {
    position: "bottom" as const,
    align: "center" as const,
  },

  /**
   * Centered above the anchor
   */
  topCenter: {
    position: "top" as const,
    align: "center" as const,
  },
};

/**
 * Helper function to create a position config with the given position preset
 * and additional properties
 */
export const createMenuPosition = (
  preset: keyof typeof menuPositionPresets,
  additionalProps: Partial<ActionMenuPosition> = {},
): ActionMenuPosition => {
  return {
    ...menuPositionPresets[preset],
    ...additionalProps,
  };
};
