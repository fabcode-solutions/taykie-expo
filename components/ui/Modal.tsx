import React, { memo } from "react";
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme";
import IconClose from "../icons/IconClose";
import { moderateScale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export interface BlurModalProps {
  variant?: "alert" | "default";
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  animationType?: "none" | "slide" | "fade";
  heading: string;
  // The backdrop is wrapped in a ScrollView purely so the keyboard-avoiding
  // view can tap-to-dismiss and short forms can scroll — it was never meant
  // to make the CONTENT scrollable. A child that renders its own FlatList
  // (e.g. SearchModal) nested inside that ScrollView triggers RN's
  // "VirtualizedLists should never be nested inside plain ScrollViews with
  // the same orientation" warning/perf hit. Pass true for any such child.
  disableInnerScroll?: boolean;
}

/**
 * Reusable BlurModal Component
 *
 * Features:
 * - Optimized with memo for performance
 * - Works with QueryClientProvider context
 * - Customizable blur intensity and animation
 * - Accessible and keyboard-friendly
 * - Platform-specific optimizations
 *
 * Usage:
 * ```tsx
 * <BlurModal
 *   visible={isVisible}
 *   onRequestClose={() => setVisible(false)}
 *   contentStyle={{ padding: 20 }}
 * >
 *   <YourContent />
 * </BlurModal>
 * ```
 */
const BlurModal: React.FC<BlurModalProps> = memo(
  ({
    variant = "default",
    visible,
    onRequestClose,
    children,
    contentStyle,
    blurIntensity,
    animationType = "fade",
    heading,
    disableInnerScroll = false,
  }) => {
    const theme = useTheme();

    const intensity = blurIntensity ?? (theme.mode === "dark" ? 40 : 50);
    const tint = theme.mode === "dark" ? "dark" : "light";

    // See disableInnerScroll's own comment — same overlay/content layout
    // either way (both just need a definite height to pass down), just a
    // plain View instead of a ScrollView when the child already owns its own
    // (virtualized) scrolling.
    const backdropContent = (
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: theme.colors.backdrop,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={[styles.content, contentStyle]}>
            {variant === "default" && (
              <View className="flex-row justify-between items-center mb-3">
                <Text
                  className=" text-slateCharcoal text-2xl font-medium font-Manrope-Medium"
                  style={{ flexShrink: 1 }}
                >
                  {heading ?? t(LocalizedStrings.schedule.placeHolders.search)}
                </Text>
                <TouchableOpacity onPress={onRequestClose}>
                  <IconClose />
                </TouchableOpacity>
              </View>
            )}
            {children}
          </View>
        </TouchableWithoutFeedback>
      </View>
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType={animationType}
        onRequestClose={onRequestClose}
        statusBarTranslucent
        hardwareAccelerated
      >
        <BlurView intensity={intensity} tint={tint} style={styles.blurContainer}>
          <TouchableWithoutFeedback onPress={onRequestClose}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ width: "100%" }}
            >
              {disableInnerScroll ? (
                <View style={{ height: "100%" }}>{backdropContent}</View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ height: "100%" }}
                >
                  {backdropContent}
                </ScrollView>
              )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </BlurView>
      </Modal>
    );
  },
);

BlurModal.displayName = "BlurModal";

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: "white",
    borderRadius: moderateScale(20),
    width: "90%",
    padding: verticalScale(20),
    maxHeight: "90%",
    overflow: "hidden",
    // Content styles will be provided by parent
  },
});

export default BlurModal;
