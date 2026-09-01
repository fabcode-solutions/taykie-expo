import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { Loader } from "../shared/loader";

interface SafeAreaScreenProps extends SafeAreaViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  withBackground?: boolean;
  showLoader?: boolean;
}

export const SafeAreaScreen: React.FC<SafeAreaScreenProps> = ({
  children,
  style,
  edges,
  withBackground = true,
  showLoader,
  ...safeAreaProps
}) => {
  const theme = useTheme();

  return (
    <>
      {showLoader && <Loader />}
      <SafeAreaView
        edges={edges}
        style={[
          styles.safeArea,
          withBackground && { backgroundColor: theme.colors.background.default },
          style,
        ]}
        {...safeAreaProps}
      >
        {children}
      </SafeAreaView>
    </>
  );
};

interface KeyboardAvoidingSafeAreaProps extends SafeAreaScreenProps {
  keyboardStyle?: StyleProp<ViewStyle>;
  behavior?: "height" | "position" | "padding";
  keyboardVerticalOffset?: number;
  enabled?: boolean;
}

export const KeyboardAvoidingSafeArea: React.FC<KeyboardAvoidingSafeAreaProps> = ({
  children,
  keyboardStyle,
  behavior = Platform.OS === "ios" ? "padding" : "height",
  keyboardVerticalOffset,
  enabled,
  ...safeAreaProps
}) => {
  return (
    <SafeAreaScreen {...safeAreaProps}>
      <KeyboardAvoidingView
        style={[styles.flex, keyboardStyle]}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled={enabled === undefined ? true : enabled}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});
