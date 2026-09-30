import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
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
 *
 * Uses core Animated with the native driver: the opacity pulse runs on the UI
 * thread, so many skeletons on screen at once don't cost JS-thread work.
 */
export const Skeleton = ({
  width = "100%",
  height = moderateScale(16),
  borderRadius = moderateScale(8),
  style,
}: SkeletonProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.divider,
          opacity,
        },
        style,
      ]}
    />
  );
};

export default Skeleton;
