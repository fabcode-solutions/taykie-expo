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

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ✅ Keyboard listeners (works on iOS + Android)
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const drawerHeight =
    typeof height === "number" ? height : (SCREEN_HEIGHT * parseInt(height.replace("%", ""))) / 100;

  // Pan responder
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => closeOnSwipeDown,
      onMoveShouldSetPanResponder: (_, g) => closeOnSwipeDown && g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeDrawer();
        else openDrawer();
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
      onClose();
    });
  }, [translateY, backdropOpacity, onClose, onAnimationStart, onAnimationComplete]);

  useEffect(() => {
    if (isVisible) {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      openDrawer();
    }
  }, [isVisible]);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) closeDrawer();
  };

  if (!isVisible) return null;

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
    <Modal transparent visible={isVisible} statusBarTranslucent animationType="none">
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPressable} onPress={handleBackdropPress}>
            <BlurView intensity={backdropBlurIntensity} tint="dark" style={styles.blurView} />
          </Pressable>
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            {
              height: drawerHeight,
              transform: [{ translateY }],
              marginBottom: keyboardHeight,
              backgroundColor: theme.colors.background.default,
            },
            containerStyle,
          ]}
        >
          {enableDrawerBlur ? (
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
