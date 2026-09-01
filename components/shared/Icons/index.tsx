import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme";

/**
 * Props for icon components
 */
interface IconProps {
  /** Size of the icon in pixels */
  size?: number;
  /** Color of the icon */
  color?: string;
  /** Additional styles to apply to the icon container */
  style?: ViewStyle;
}

/**
 * Helper function to create icon components
 * @param renderPaths - Function that renders the SVG paths
 * @param defaultSize - Default size of the icon
 * @param displayName - Display name of the icon
 */
const createIcon = (
  renderPaths: (props: { size: number; color: string }) => React.ReactNode,
  defaultSize = 24,
  displayName: string,
) => {
  const Icon: React.FC<IconProps> = ({ size = defaultSize, color, style }) => {
    const theme = useTheme();
    const iconColor = color ?? theme.colors.icon;
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {renderPaths({ size, color: iconColor })}
        </Svg>
      </View>
    );
  };
  Icon.displayName = displayName;
  return Icon;
};

/**
 * Search icon component
 */
export const SearchIcon = createIcon(
  ({ color }) => (
    <Path
      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  24,
  "SearchIcon",
);

/**
 * Close/X icon component
 */
export const CloseIcon = createIcon(
  ({ color }) => (
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  24,
  "CloseIcon",
);
