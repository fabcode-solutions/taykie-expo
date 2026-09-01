import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { KeyboardAvoidingSafeArea } from "@/components";
import { SvgIcon } from "@/components/SvgIcon";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onSkip?: () => void;
  showBack?: boolean;
  showSkip?: boolean;
  skipLabel?: string;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  onBack,
  onSkip,
  showBack = true,
  showSkip = false,
  skipLabel,
  scrollable = true,
  contentStyle,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const progress = currentStep / totalSteps;

  const Content = scrollable ? ScrollView : View;
  const contentProps = scrollable
    ? {
        contentContainerStyle: [styles.scrollContent, contentStyle],
        keyboardShouldPersistTaps: "handled" as const,
        showsVerticalScrollIndicator: false,
      }
    : { style: [styles.flexContent, contentStyle] };

  return (
    <KeyboardAvoidingSafeArea
      style={[styles.root, { backgroundColor: theme.colors.background.default }]}
      keyboardStyle={styles.flex}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Back button */}
        <View style={styles.headerLeft}>
          {showBack && onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.backBtn, { backgroundColor: theme.colors.primary.main }]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <SvgIcon name="leftCaret" size={16} color={theme.colors.black} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
        </View>

        {/* Step indicator */}
        <ThemeText
          variant="manrope.caption"
          style={[styles.stepLabel, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.common.step)} {currentStep} {t(LocalizedStrings.common.of)}{" "}
          {totalSteps}
        </ThemeText>

        {/* Skip button */}
        <View style={styles.headerRight}>
          {showSkip && onSkip ? (
            <TouchableOpacity
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
            >
              <ThemeText variant="manrope.body2" style={{ color: theme.colors.text.secondary2 }}>
                {skipLabel ?? t(LocalizedStrings.common.skip)}
              </ThemeText>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.gray[200] }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.primary.main,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>

      {/* Content */}
      <Content {...contentProps}>{children}</Content>
    </KeyboardAvoidingSafeArea>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(16),
      paddingBottom: verticalScale(12),
    },
    headerLeft: {
      width: scale(56),
      alignItems: "flex-start",
    },
    headerRight: {
      width: scale(56),
      alignItems: "flex-end",
    },
    backBtn: {
      width: scale(40),
      height: scale(40),
      borderRadius: moderateScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    backBtnPlaceholder: {
      width: scale(40),
      height: scale(40),
    },
    skipPlaceholder: {
      width: scale(40),
    },
    stepLabel: {
      textAlign: "center",
    },
    progressTrack: {
      height: verticalScale(4),
      marginHorizontal: scale(20),
      borderRadius: moderateScale(2),
      marginBottom: verticalScale(8),
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: moderateScale(2),
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: scale(24),
      paddingBottom: verticalScale(32),
    },
    flexContent: {
      flex: 1,
      paddingHorizontal: scale(24),
    },
  });

export default OnboardingLayout;
