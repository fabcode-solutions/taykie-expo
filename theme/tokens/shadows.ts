import { Platform, ViewStyle } from "react-native";

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ShadowsDefinition = {
  [key in ElevationLevel]: ViewStyle;
} & {
  none: ViewStyle;
};

// Helper function to create shadows based on elevation level
const createShadow = (level: ElevationLevel): ViewStyle => {
  if (level === 0) {
    return {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
  }

  // iOS uses shadow properties
  if (Platform.OS === "ios") {
    return {
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: level === 1 ? 1 : level,
      },
      shadowOpacity: 0.1 + level * 0.03, // Increase opacity slightly with level
      shadowRadius: level * 2,
    };
  }

  // Android uses elevation
  return {
    elevation: level * 2,
  };
};

// Create shadows for light mode
export const lightShadows: ShadowsDefinition = {
  none: createShadow(0),
  0: createShadow(0),
  1: createShadow(1),
  2: createShadow(2),
  3: createShadow(3),
  4: createShadow(4),
  5: createShadow(5),
};

// Create shadows for dark mode (slightly more subtle)
export const darkShadows: ShadowsDefinition = {
  none: createShadow(0),
  0: createShadow(0),
  1: { ...createShadow(1), shadowColor: "#222222", elevation: 2 },
  2: { ...createShadow(2), shadowColor: "#222222", elevation: 4 },
  3: { ...createShadow(3), shadowColor: "#222222", elevation: 6 },
  4: { ...createShadow(4), shadowColor: "#222222", elevation: 8 },
  5: { ...createShadow(5), shadowColor: "#222222", elevation: 10 },
};
