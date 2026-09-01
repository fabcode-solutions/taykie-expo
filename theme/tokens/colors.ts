export type ColorScheme = "light" | "dark";

export interface ColorPalette {
  // Brand colors
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  // Feedback colors
  success: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  info: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  warning: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  error: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  // Neutral colors
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  // Text colors
  text: {
    primary: string;
    secondary: string;
    secondary2: string;
    disabled: string;
    hint: string;
    dark: string;
    subtle: string;
  };
  // Background colors
  background: {
    default: string;
    paper: string;
    elevated: string;
  };
  tab: {
    background: string;
    text: {
      primary: string;
      secondary: string;
    };
  };
  // Special colors
  favorite: string;
  divider: string;
  backdrop: string;
  white: string;
  black: string;
  slateCharcoal: string;
  transparent: string;
  // New semantic colors
  inputBackground: string;
  icon: string;
  activityIndicator: string;
  border: string;
  taupe: string;
}

// Define base colors - shared between themes
const baseColors = {
  primary: {
    main: "#FFFA9C",
    light: "#E8DFFF",
    dark: "#505050",
    contrast: "#ffffff",
  },
  secondary: {
    main: "#f34f4f",
    light: "rgba(243, 79, 79, 0.2)",
    dark: "#c43c3c",
    contrast: "#ffffff",
  },
  success: {
    main: "#21C800",
    light: "rgba(181, 228, 139, 0.2)",
    dark: "#91c665",
    contrast: "#000000",
  },
  info: {
    main: "#4f86f4",
    light: "rgba(79, 134, 244, 0.2)",
    dark: "#3a63b8",
    contrast: "#ffffff",
  },
  warning: {
    main: "#f5a524",
    light: "rgba(245, 165, 36, 0.2)",
    dark: "#c4831c",
    contrast: "#000000",
  },
  error: {
    main: "#ef3e55",
    light: "rgba(239, 62, 85, 0.2)",
    dark: "#c32c41",
    contrast: "#ffffff",
  },
  favorite: "#FCE37D",
  white: "#ffffff",
  black: "#000000",
  slateCharcoal: "#262520",
  transparent: "transparent",
  taupe: "#B6A999",
};

// Light theme color palette
export const lightColors: ColorPalette = {
  ...baseColors,
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  text: {
    primary: "#262520",
    secondary: "#00000080",
    secondary2: "#6C757D",
    disabled: "#9E9E9E",
    hint: "#6C757D",
    dark: "#000000",
    subtle: "#6C757D",
  },
  background: {
    default: "#F8F9F3",
    paper: "#ffffff",
    elevated: "#ffffff",
  },
  tab: {
    background: "#000",
    text: {
      primary: "#fff",
      secondary: "#505050",
    },
  },
  divider: "#B3B3B3",
  backdrop: "rgba(0, 0, 0, 0.5)",
  inputBackground: "#FFF",
  icon: "#1C1F21",
  activityIndicator: "#6B7280",
  border: "#B3B3B3",
};

// Dark theme color palette
export const darkColors: ColorPalette = {
  ...baseColors,
  primary: {
    ...baseColors.primary,
    main: "#FFFA9C",
  },
  gray: {
    50: "#18191A",
    100: "#242526",
    200: "#3A3B3C",
    300: "#4E4F50",
    400: "#6A6B6C",
    500: "#8A8B8C",
    600: "#AAABAC",
    700: "#CCCDCE",
    800: "#EEEFF0",
    900: "#F5F6F7",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#B0B3B8",
    secondary2: "#8A8D91",
    disabled: "#6C6C6C",
    hint: "#8A8D91",
    dark: "#FFFFFF",
    subtle: "#8A8D91",
  },
  background: {
    default: "#222222",
    paper: "#242526",
    elevated: "#3A3B3C",
  },
  tab: {
    background: "#222222",
    text: {
      primary: "#FFFFFF",
      secondary: "#B0B3B8",
    },
  },
  divider: "#3A3B3C",
  backdrop: "rgba(0, 0, 0, 0.5)",
  inputBackground: "#3A3B3C",
  icon: "#FFFFFF",
  activityIndicator: "#8A8D91",
  border: "#3A3B3C",
};

const tintColorLight = "#ef3e55";
const tintColorDark = "#fff";

export { tintColorLight, tintColorDark };
