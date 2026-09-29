import React, { useEffect, useRef, useCallback } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  Dimensions,
  AccessibilityInfo,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/hooks";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AlertConfig, AlertStyles } from "@/types/alert";
import { ALERT_COLORS, ALERT_CONSTANTS, ALERT_ICONS } from "@/constants/alert";
import { ThemeText, ThemeView } from "@/components/primitives";
import { moderateScale, verticalScale } from "@/utils/scale";

interface AlertProps extends AlertConfig {
  index: number;
  onRemove: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  id: _id,
  type,
  title,
  message,
  position = "top",
  onPress,
  onDismiss,
  dismissible = true,
  showIcon = true,
  customIcon,
  action,
  index,
  onRemove,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get("window");

  // Animation values
  const translateY = useRef(new Animated.Value(position === "top" ? -200 : 200)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  // Calculate position offset for stacked alerts
  const positionOffset = index * (ALERT_CONSTANTS.ALERT_HEIGHT + ALERT_CONSTANTS.ALERT_MARGIN);

  // Pan responder for swipe to dismiss
  const lastDx = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 5 && dismissible,
      onPanResponderMove: (_, { dx }) => {
        lastDx.current = dx;
        translateX.setValue(dx);
        const pct = Math.abs(dx) / screenWidth;
        opacity.setValue(1 - pct);
      },
      onPanResponderRelease: (_, { dx }) => {
        if (Math.abs(dx) > ALERT_CONSTANTS.SWIPE_THRESHOLD) {
          dismissAlert();
        } else {
          Animated.parallel([
            /* snap back */
          ]).start();
        }
      },
    }),
  ).current;

  // Show animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue:
          position === "top"
            ? positionOffset + insets.top + ALERT_CONSTANTS.ALERT_MARGIN
            : -(positionOffset + insets.bottom + ALERT_CONSTANTS.ALERT_MARGIN),
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ALERT_CONSTANTS.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
    ]).start();

    // Announce to screen readers
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(`${type} alert: ${title}. ${message ?? ""}`);
    }
  }, [
    positionOffset,
    insets.bottom,
    insets.top,
    message,
    opacity,
    position,
    scale,
    title,
    translateY,
    type,
  ]);

  // Dismiss animation
  const dismissAlert = useCallback(() => {
    const toValue = lastDx.current > 0 ? screenWidth : -screenWidth;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue,
        duration: ALERT_CONSTANTS.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ALERT_CONSTANTS.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: ALERT_CONSTANTS.ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
      onRemove();
    });
  }, [onDismiss, onRemove, opacity, scale, screenWidth, translateX]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (dismissible) {
      dismissAlert();
    }
  };

  // Get styles based on theme and alert type
  const styles = getStyles(theme, type);
  const alertColors = ALERT_COLORS[type];
  const accentPalette = theme.colors[alertColors.accent] as {
    main: string;
    light: string;
  };
  const accentColor = accentPalette.main;
  const accentTint = accentPalette.light;
  const cardBackground = theme.colors.background.elevated;
  const titleColor = theme.colors.text.primary;
  const messageColor = theme.colors.text.secondary;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position]: 0,
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Pressable onPress={handlePress} style={{ flex: 1 }}>
        <ThemeView
          style={[styles.contentContainer, { backgroundColor: cardBackground }]}
          elevation={3}
          rounded="md"
        >
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          {showIcon && (
            <View style={[styles.iconContainer, { backgroundColor: accentTint }]}>
              {customIcon ?? (
                <Ionicons
                  name={ALERT_ICONS[type] as keyof typeof Ionicons.glyphMap}
                  size={moderateScale(20)}
                  color={accentColor}
                />
              )}
            </View>
          )}

          <View style={styles.textContainer}>
            <ThemeText
              variant="manrope.subtitle"
              style={styles.titleText}
              numberOfLines={1}
              color={titleColor}
            >
              {title}
            </ThemeText>
            {message && (
              <ThemeText
                variant="manrope.body2"
                style={styles.messageText}
                numberOfLines={2}
                color={messageColor}
              >
                {message}
              </ThemeText>
            )}
          </View>

          {action && (
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
              onPress={action.onPress}
            >
              <ThemeText
                variant="manrope.button"
                style={styles.actionText}
                color={accentColor}
                uppercase
              >
                {action.text}
              </ThemeText>
            </Pressable>
          )}

          {dismissible && !action && (
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
              onPress={dismissAlert}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-outline"
                size={moderateScale(20)}
                color={theme.colors.text.secondary}
              />
            </Pressable>
          )}
        </ThemeView>
      </Pressable>
    </Animated.View>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>, _type: string): AlertStyles => {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: theme.spacing.md,
      right: theme.spacing.md,
      minHeight: verticalScale(ALERT_CONSTANTS.ALERT_HEIGHT),
      zIndex: 9999,
    },
    contentContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: theme.spacing.md + moderateScale(4),
      paddingRight: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: verticalScale(ALERT_CONSTANTS.ALERT_HEIGHT),
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    accentBar: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: moderateScale(4),
    },
    iconContainer: {
      width: moderateScale(36),
      height: moderateScale(36),
      borderRadius: moderateScale(18),
      marginRight: theme.spacing.sm,
      justifyContent: "center",
      alignItems: "center",
    },
    textContainer: {
      flex: 1,
      justifyContent: "center",
    },
    titleText: {
      fontSize: moderateScale(16),
      fontWeight: "600",
    },
    messageText: {
      marginTop: theme.spacing.xxs,
    },
    actionButton: {
      marginLeft: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      justifyContent: "center",
    },
    actionText: {
      fontWeight: "600",
    },
    closeButton: {
      marginLeft: theme.spacing.sm,
      padding: theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
  });
};
