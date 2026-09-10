import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { moderateScale } from "@/utils/scale";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A pulsing placeholder box shown while content is loading. Uses the
 * divider color so it stays readable in both light and dark themes.
 */
export const Skeleton = ({
  width = "100%",
  height = moderateScale(16),
  borderRadius = moderateScale(8),
  style,
}: SkeletonProps) => {
  const theme = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.divider,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export default Skeleton;
