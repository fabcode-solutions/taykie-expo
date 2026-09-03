import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBannerStore } from "@/stores/bannerStore";
import { useBLEStore } from "@/stores/bleStore";
import { router } from "expo-router";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { playTone, stopTone, toneLabelForIndex, DEFAULT_VOLUME_LEVEL } from "@/utils/toneAudio";
import {
  isDosageReminder,
  triggerDeviceSoundForReminder,
  stopDeviceSoundForReminder,
} from "@/utils/reminderSound";
import type { Audio } from "expo-av";

const SWIPE_DISMISS_DISTANCE = 40; // px dragged up
const SWIPE_DISMISS_VELOCITY = 500; // px/s upward flick

export function InAppBanner() {
  const { message, isVisible, hideBanner } = useBannerStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-150); // Start off-screen
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Spring down
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });

    // Only dosage reminders get the custom tone (phone + physical device) —
    // social notifications (Like/Comment/Follow/...) just show the banner
    // visually, no looped alarm-style sound layered on top.
    if (isDosageReminder(message)) {
      const toneLabel = toneLabelForIndex(useBLEStore.getState().toneIndex);
      const volumeLevel = useBLEStore.getState().volumeLevel ?? DEFAULT_VOLUME_LEVEL;
      playTone(toneLabel, { loop: true, volumeLevel })
        .then((sound) => {
          currentSoundRef.current = sound;
        })
        .catch((e) => console.warn("Failed to play banner tone:", e));

      triggerDeviceSoundForReminder();
    }

    // Auto-hide after 4 seconds
    const timeout = setTimeout(() => {
      closeBanner();
    }, 4000);
    return () => clearTimeout(timeout);
  }, [isVisible]);

  // The single funnel for every dismiss path (tap, swipe, auto-hide
  // timeout) — stopping the sound here means it cuts off immediately on
  // user action rather than waiting for the ~300ms slide-up animation.
  const closeBanner = () => {
    stopTone(currentSoundRef.current);
    currentSoundRef.current = null;
    if (isDosageReminder(message)) {
      stopDeviceSoundForReminder();
    }
    translateY.value = withTiming(-150, { duration: 300 }, () => {
      runOnJS(hideBanner)();
    });
  };

  const handlePress = () => {
    closeBanner();

    // Extract your custom data
    const data = message?.data;
    console.log("🔔 Custom Banner Clicked:", data);

    // Your existing routing logic
    switch (data?.type) {
      case "Like":
        router.navigate("/(tabs)/community");
        break;
      case "Comment":
        router.push({
          pathname: "/(tabs)/community",
          params: { commentId: "Following" }, // Adjust based on your data
        });
        break;
      case "Follow":
        router.navigate("/profile/follow");
        break;
      default:
        break;
    }
  };

  // Swipe up to dismiss, matching the system notification banner gesture.
  // Only allows upward movement (clamped at 0) so it can't be dragged below
  // its resting position; snaps back if the swipe wasn't decisive enough.
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      const draggedUpEnough = event.translationY < -SWIPE_DISMISS_DISTANCE;
      const flickedUp = event.velocityY < -SWIPE_DISMISS_VELOCITY;
      if (draggedUpEnough || flickedUp) {
        runOnJS(closeBanner)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!message && !isVisible) return null;

  const title = message?.notification?.title || "New Notification";
  const body = message?.notification?.body || "";

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          { top: Math.max(insets.top, 10) }, // Respect notch/dynamic island
        ]}
      >
        <Pressable style={styles.banner} onPress={handlePress}>
          <View style={styles.iconPlaceholder}>
            {/* Replace with your app logo or an icon */}
            <Text style={styles.iconText}>T</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: scale(16),
    right: scale(16),
    zIndex: 9999, // Ensure it's above everything
  },
  banner: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)", // iOS frosted glass look
    borderRadius: moderateScale(20),
    padding: verticalScale(12),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(12),
    elevation: 5,
  },
  iconPlaceholder: {
    aspectRatio: 1,
    height: verticalScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: "#D5C8BD", // Your app's brand color
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  iconText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: moderateScale(18),
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    fontSize: moderateScale(15),
    color: "#1C1C1E",
    marginBottom: verticalScale(2),
  },
  body: {
    fontSize: moderateScale(14),
    color: "#3A3A3C",
  },
});
