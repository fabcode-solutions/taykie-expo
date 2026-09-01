import { scale, verticalScale } from "@/utils/scale";
import React from "react";
import { Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// ------------------------------------
// Types
// ------------------------------------
interface SwitchProps {
  value: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  trackColors?: {
    on: string;
    off: string;
  };
}

// ------------------------------------
// Switch Component
// ------------------------------------
const Switch: React.FC<SwitchProps> = ({
  value,
  onPress,
  style,
  duration = 400,
  trackColors = { on: "#47D257", off: "#B4B4B4" },
}) => {
  const height = useSharedValue(0);
  const width = useSharedValue(0);

  const trackAnimatedStyle = useAnimatedStyle((): ViewStyle => {
    const progress = Number(value);
    const color = interpolateColor(progress, [0, 1], [trackColors.off, trackColors.on]);

    return {
      backgroundColor: withTiming(color, { duration }),
      borderRadius: height.value / 2,
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle((): ViewStyle => {
    const progress = Number(value);
    const moveValue = interpolate(progress, [0, 1], [0, width.value - height.value]);

    return {
      transform: [{ translateX: withTiming(moveValue, { duration }) }],
      borderRadius: height.value / 2,
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
          width.value = e.nativeEvent.layout.width;
        }}
        style={[switchStyles.track, trackAnimatedStyle, style] as StyleProp<ViewStyle>}
      >
        <Animated.View style={[switchStyles.thumb, thumbAnimatedStyle]} />
      </Animated.View>
    </Pressable>
  );
};

// ------------------------------------
// Styles
// ------------------------------------
const switchStyles = StyleSheet.create({
  track: {
    alignItems: "flex-start",
    width: scale(100),
    height: verticalScale(40),
    padding: verticalScale(2),
  },
  thumb: {
    height: "100%",
    aspectRatio: 1,
    backgroundColor: "white",
  },
});
export default Switch;
