import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

interface RangeSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  trackColor?: string;
  activeTrackColor?: string;
  thumbColor?: string;
  style?: StyleProp<ViewStyle>;
}

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;

// A minimal drag-to-select slider, snapped to integer `step` values. Built
// custom (rather than pulling in @react-native-community/slider) so this
// doesn't require adding a new native dependency and another native
// rebuild — react-native-gesture-handler and react-native-reanimated are
// already used elsewhere in the app (see components/inAppBanner.tsx).
export default function RangeSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  trackColor = "rgba(0,0,0,0.1)",
  activeTrackColor,
  thumbColor,
  style,
}: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  // The last value actually reported up to the caller — dragging within
  // the same step (or tiny jitter) shouldn't re-fire onValueChange.
  const lastReportedValue = useRef(value);

  const usableWidth = Math.max(0, trackWidth - THUMB_SIZE);

  const valueToX = useCallback(
    (v: number) => {
      if (usableWidth <= 0) return 0;
      const ratio = (v - minimumValue) / (maximumValue - minimumValue);
      return ratio * usableWidth;
    },
    [usableWidth, minimumValue, maximumValue],
  );

  const xToValue = useCallback(
    (x: number) => {
      if (usableWidth <= 0) return minimumValue;
      const ratio = x / usableWidth;
      const raw = minimumValue + ratio * (maximumValue - minimumValue);
      const stepped = Math.round(raw / step) * step;
      return Math.min(maximumValue, Math.max(minimumValue, stepped));
    },
    [usableWidth, minimumValue, maximumValue, step],
  );

  // Keeps the thumb in sync with an externally-controlled value change
  // (e.g. store state updating from elsewhere) while not being dragged.
  useEffect(() => {
    lastReportedValue.current = value;
    translateX.value = valueToX(value);
  }, [value, valueToX, translateX]);

  const reportChange = useCallback(
    (x: number) => {
      const nextValue = xToValue(x);
      if (nextValue !== lastReportedValue.current) {
        lastReportedValue.current = nextValue;
        onValueChange(nextValue);
      }
    },
    [xToValue, onValueChange],
  );

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const next = Math.min(Math.max(startX.value + event.translationX, 0), usableWidth);
      translateX.value = next;
      runOnJS(reportChange)(next);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[styles.track, { backgroundColor: trackColor }, style]}
        onLayout={handleLayout}
        hitSlop={{ top: 12, bottom: 12 }}
      >
        <Animated.View
          style={[styles.fill, fillStyle, { backgroundColor: activeTrackColor ?? thumbColor }]}
        />
        <Animated.View style={[styles.thumb, thumbStyle, { backgroundColor: thumbColor }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: "center",
    overflow: "visible",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
