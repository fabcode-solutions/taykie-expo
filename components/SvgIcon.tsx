import { ICONS } from "../assets/Icons";
import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

export type SvgIconName = keyof typeof ICONS;

/**
 * Custom SVG icon component that uses the provided SVG paths for each icon.
 */
export function SvgIcon({
  name,
  size = 24,
  color,
  style,
  stroke,
}: {
  name: SvgIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  stroke?: string;
}) {
  const iconData = ICONS[name];

  if (!iconData) {
    if (__DEV__) {
      console.warn(`SvgIcon: icon "${name}" not found in ICONS map.`);
    }
    return null;
  }

  const hasPaths = (d: any): d is { paths: string[] } => Array.isArray(d?.paths);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width="100%" height="100%" viewBox={iconData?.viewBox} fill="none">
        {hasPaths(iconData) ? (
          iconData.paths.map((p, i) => (
            <Path
              key={i}
              d={p}
              fillRule="evenodd"
              clipRule="evenodd"
              fill={color}
              stroke={stroke ?? (iconData.stroke ? color : "none")}
              strokeWidth={iconData.strokeWidth ?? 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))
        ) : (
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d={(iconData as any)?.path}
            fill={color}
            stroke={stroke ?? (iconData.stroke ? color : "none")}
            strokeWidth={iconData.strokeWidth ?? 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </View>
  );
}
