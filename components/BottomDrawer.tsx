import React, { useEffect, useRef, useCallback, memo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Modal,
  Animated,
  PanResponder,
  Platform,
  Keyboard,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme";
import type { BottomDrawerProps } from "@/types/bottomDrawer.types";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const BottomDrawerComponent: React.FC<BottomDrawerProps> = ({
  isVisible,
  onClose,
  children,
  title,
  height = "80%",
  showHandle = true,
  closeOnBackdropPress = true,
  closeOnSwipeDown = true,
  containerStyle,
  contentStyle,
  headingStyle,
  backdropBlurIntensity = 15,
  drawerBlurIntensity = 2,
  enableDrawerBlur = true,
  onAnimationStart,
  onAnimationComplete,
}) => {
  const theme = useTheme();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Keyboard top edge in screen coordinates (0 = keyboard hidden), and how far the drawer
  // actually has to be lifted. They are NOT the same as the keyboard height: on Android
  // the Modal's window often resizes for the keyboard already, so lifting by the full
  // keyboard height pushed the drawer up to the top of the screen, far above the keyboard.
  const keyboardTopRef = useRef(0);
  const containerRef = useRef<View>(null);
  const [lift, setLift] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(SCREEN_HEIGHT);
  // Stays mounted while the close animation runs, so a parent-driven close (e.g. after
  // "Save") slides down instead of vanishing on the spot.
  const [isRendered, setIsRendered] = useState(isVisible);
  // Live blur re-renders every frame on Android (expo-blur), which made the slide
  // stutter — the dim rgba backdrop already does the job there.
  const useBlur = Platform.OS === "ios";

  // Keyboard listeners. iOS "Will" events fire with the keyboard animation, so the drawer
  // moves with it instead of jumping after it.
  // Measures the drawer's window against the keyboard: lift = only the part of the window
  // the keyboard really covers (0 when the window already resized).
  const updateKeyboardLayout = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop <= 0) {
      setLift(0);
      setAvailableHeight(SCREEN_HEIGHT);
      return;
    }
    containerRef.current?.measureInWindow((_x, y, _w, h) => {
      const overlap = Math.max(0, y + h - keyboardTop);
      setLift(overlap);
      // Room between the top of the window and the keyboard.
      setAvailableHeight(Math.max(0, keyboardTop - y));
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const { screenY, height: kbHeight } = e.endCoordinates;
      keyboardTopRef.current = screenY > 0 ? screenY : Dimensions.get("screen").height - kbHeight;
      updateKeyboardLayout();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      updateKeyboardLayout();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [updateKeyboardLayout]);

  const requestedHeight =
    typeof height === "number" ? height : (SCREEN_HEIGHT * parseInt(height.replace("%", ""))) / 100;
  // Shrink to what's left above the keyboard, so a tall drawer never runs off the top
  // and the content/input stay visible.
  const drawerHeight = Math.min(requestedHeight, availableHeight - verticalScale(24));

  // Pan responder. It's created once, so it calls the LATEST open/close through refs —
  // it used to keep the first render's closures (stale onClose).
  const closeDrawerRef = useRef<() => void>(() => {});
  const openDrawerRef = useRef<() => void>(() => {});
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => closeOnSwipeDown,
      onMoveShouldSetPanResponder: (_, g) => closeOnSwipeDown && g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeDrawerRef.current();
        else openDrawerRef.current();
      },
    }),
  ).current;

  // Open animation
  const openDrawer = useCallback(() => {
    onAnimationStart?.();

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(onAnimationComplete);
  }, [translateY, backdropOpacity, onAnimationStart, onAnimationComplete]);

  // Close animation
  const closeDrawer = useCallback(() => {
    onAnimationStart?.();

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete?.();
      setIsRendered(false);
      onClose();
    });
  }, [translateY, backdropOpacity, onClose, onAnimationStart, onAnimationComplete]);

  closeDrawerRef.current = closeDrawer;
  openDrawerRef.current = openDrawer;

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      openDrawer();
    } else if (isRendered) {
      // Closed by the parent (not by swipe/backdrop, which already animated out):
      // slide down, then unmount.
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) closeDrawer();
  };

  if (!isVisible && !isRendered) return null;

  const DrawerContent = (
    <View style={styles.drawerContent}>
      {showHandle && (
        <View style={styles.handleContainer} {...handlePanResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
        </View>
      )}

      {title && (
        <Text style={[styles.title, { color: theme.colors.text?.primary }, headingStyle]}>
          {title}
        </Text>
      )}

      <View style={[styles.contentContainer, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <Modal
      transparent
      visible={isVisible || isRendered}
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleBackdropPress}
    >
      <View
        ref={containerRef}
        style={styles.modalContainer}
        // The window may resize a moment AFTER the keyboard event (Android): re-measure.
        onLayout={updateKeyboardLayout}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPressable} onPress={handleBackdropPress}>
            {useBlur && (
              <BlurView intensity={backdropBlurIntensity} tint="dark" style={styles.blurView} />
            )}
          </Pressable>
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            {
              height: drawerHeight,
              transform: [{ translateY }],
              marginBottom: lift,
              backgroundColor: theme.colors.background.default,
            },
            containerStyle,
          ]}
        >
          {enableDrawerBlur && useBlur ? (
            <BlurView intensity={drawerBlurIntensity} tint="light" style={styles.drawerBlurView}>
              {DrawerContent}
            </BlurView>
          ) : (
            DrawerContent
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropPressable: {
    flex: 1,
  },
  blurView: {
    flex: 1,
  },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: moderateScale(16),
    borderTopRightRadius: moderateScale(16),
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -verticalScale(3) },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(10),
      },
      android: {
        elevation: 20,
      },
    }),
  },
  drawerBlurView: {
    flex: 1,
    borderTopLeftRadius: moderateScale(16),
    borderTopRightRadius: moderateScale(16),
    overflow: "hidden",
  },
  drawerContent: {
    flex: 1,
    paddingTop: verticalScale(8),
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(12),
  },
  handle: {
    width: scale(50),
    height: verticalScale(4),
    borderRadius: moderateScale(10),
  },
  title: {
    fontFamily: "Manrope-Bold",
    fontSize: moderateScale(16),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  contentContainer: {
    flex: 1,
  },
});

export const BottomDrawer = memo(BottomDrawerComponent);
