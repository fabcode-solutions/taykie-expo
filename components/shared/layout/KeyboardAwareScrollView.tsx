import React, { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
  ScrollViewProps,
  KeyboardAvoidingViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  containerStyle?: ViewStyle;
  keyboardOffset?: number;
  behavior?: KeyboardAvoidingViewProps["behavior"];
  enableOnAndroid?: boolean;
}

export const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  containerStyle,
  keyboardOffset,
  behavior,
  enableOnAndroid = true,
  contentContainerStyle,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // Calculate proper offset based on platform and header
  const defaultOffset = Platform.select({
    ios: headerHeight || 0,
    android: 0,
    default: 0,
  });

  const keyboardBehavior =
    behavior ||
    Platform.select({
      ios: "padding" as const,
      android: undefined, // Android handles this better natively
      default: undefined,
    });

  const shouldEnable = Platform.OS === "ios" || enableOnAndroid;

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardOffset ?? defaultOffset}
      enabled={shouldEnable}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
          contentContainerStyle,
        ]}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
