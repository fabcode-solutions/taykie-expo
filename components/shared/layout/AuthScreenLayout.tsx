import React from "react";
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  View,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { KeyboardAvoidingSafeArea } from "@/components";
import BackButton, { type BackButtonProps } from "@/components/shared/navigation/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

export interface AuthScreenLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  headerTopSpacing?: number; // space from top safe area to back button section
  headerBottomSpacing?: number; // space below back button section
  backButtonProps?: Omit<BackButtonProps, "onPress">;
}

const AuthScreenLayout: React.FC<AuthScreenLayoutProps> = ({
  children,
  onBack,
  containerStyle,
  contentContainerStyle,
  headerTopSpacing = 40,
  headerBottomSpacing = 24,
  backButtonProps,
}) => {
  const theme = useTheme();
  const [showShadow, setShowShadow] = React.useState(false);

  const handleScroll = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowShadow(y > 0);
  }, []);

  return (
    <KeyboardAvoidingSafeArea
      style={[styles.root, { backgroundColor: theme.colors.background.default }, containerStyle]}
      keyboardStyle={styles.flex}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: headerTopSpacing,
            paddingBottom: headerBottomSpacing,
            backgroundColor: theme.colors.background.default,
          },
          showShadow && Platform.OS === "ios" && styles.headerShadow, // only iOS shadow
        ]}
      >
        <BackButton onPress={onBack ?? (() => router.back())} {...backButtonProps} />

        {/* Android fake shadow */}
        {Platform.OS === "android" && showShadow && (
          <LinearGradient
            colors={["rgba(0,0,0,0.08)", "transparent"]}
            style={styles.androidHeaderShadow}
          />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingSafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 500,
    paddingHorizontal: scale(24),
    overflow: "visible",
  },
  // iOS shadow
  headerShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(8) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(6),
    zIndex: 1,
  },
  // Android fake shadow
  androidHeaderShadow: {
    position: "absolute",
    bottom: -verticalScale(6),
    left: 0,
    right: 0,
    height: verticalScale(6),
    zIndex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignSelf: "center",
    width: "100%",
    maxWidth: 500,
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(24),
  },
});

export default AuthScreenLayout;
