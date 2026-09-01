import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolWeight } from "expo-symbols";
import React from "react";
import { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

// Add your SFSymbol to Ionicons mappings here.
const MAPPING = {
  // See Ionicons here: https://ionic.io/ionicons
  // See SF Symbols in the SF Symbols app on Mac.
  "house.fill": "home-outline",
  "paperplane.fill": "send-outline",
  "chevron.left.forwardslash.chevron.right": "code-outline",
  "chevron.right": "chevron-forward-outline",
  "settings.fill": "settings-outline",
  "gearshape.fill": "settings-outline",
} as Partial<
  Record<
    import("expo-symbols").SymbolViewProps["name"],
    React.ComponentProps<typeof Ionicons>["name"]
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and Ionicons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to Ionicons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <Ionicons color={color} size={size} name={MAPPING[name]} style={style} />;
}
