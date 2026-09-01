import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Figma frame size
const BASE_WIDTH = 430;
const BASE_HEIGHT = 932;

// Scale based on width
export const scale = (size: number) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Scale based on height
export const verticalScale = (size: number) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

// Moderate scale (best for fonts)
export const moderateScale = (size: number, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};
