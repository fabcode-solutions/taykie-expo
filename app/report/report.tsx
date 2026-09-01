import { StyleSheet, TouchableOpacity, View, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import IconTick from "@/components/icons/IconTick";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { Loader } from "@/components/shared/loader";
import { ReportRequest } from "@/services/api/auth";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { usePostStore } from "@/stores/postStore";
const OPTIONS = [
  {
    label: "Spam or misleading content",
    key: "spam",
    type: "Spam",
  },
  {
    label: "Harassment or bullying",
    key: "harassment",
    type: "Harassment",
  },
  {
    label: "Hate speech or discrimination",
    key: "hate_speech",
    type: "Inappropriate Content",
  },
  {
    label: "Sharing false Product information",
    key: "false_information",
    type: "Inappropriate Content",
  },
  {
    label: "Impersonation or fake account",
    key: "fake_account",
    type: "Fake Account",
  },
  {
    label: "Mental health or safety concern",
    key: "safety_concern",
    type: "Other",
  },
];
export default function ReportScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const { reportType, postId, userId } = useLocalSearchParams<{
    reportType?: string;
    postId?: string;
  }>();
  const { isLoading, submitUserReport } = useAuthStore();
  const { submitPostReport, isLoading: postLoading } = usePostStore();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selected, setSelected] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  const handleSelected = (item: { key: string; label: string }) => {
    setSelected((prev) => (prev?.key === item.key ? null : item));
  };

  const handleReport = useCallback(async () => {
    try {
      let message = "";
      const request: ReportRequest = {
        reason: selected?.label,
        type: selected?.type,
      };

      switch (reportType) {
        case "report":
          message = await submitPostReport(postId, request);
          break;
        default:
          message = await submitUserReport(request);
      }
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      router.back();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [postId, reportType, selected?.label, selected?.type, submitPostReport, submitUserReport]);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: verticalScale(80) }}
      >
        <View>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <View style={styles.backButtonInner}>
              <IconBackArrow />
            </View>
          </TouchableOpacity>
        </View>
        <View style={[styles.headerRow]}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t(LocalizedStrings.report.title)}
          </ThemeText>
        </View>
        <View style={styles.section}>
          {OPTIONS.map((item) => (
            <View key={item.key}>
              <TouchableOpacity onPress={() => handleSelected(item)} style={styles.checkboxRow}>
                <View
                  style={[
                    selected?.key.includes(item.key) ? styles.tickFilled : styles.tickEmpty,
                    styles.checkbox,
                  ]}
                >
                  {selected?.key.includes(item.key) && <IconTick width={12} height={12} />}
                </View>
                <Text style={styles.optionText}>{t(`report.options.${item.key}`)}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionInfoText}>{t(LocalizedStrings.report.note)}</Text>
        </View>
        <View style={styles.bottomButtonContainer}>
          <Button
            variant="primary"
            onPress={handleReport}
            title={t(LocalizedStrings.report.send)}
            style={styles.browseButton}
            loading={postLoading || isLoading}
            disabled={!selected}
          ></Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
    },
    backButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonInner: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    section: {
      marginTop: verticalScale(20),
      backgroundColor: theme.colors.white,
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(20),
      borderRadius: moderateScale(20),
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
    checkbox: {
      aspectRatio: 1,
      height: verticalScale(20),
      borderRadius: moderateScale(30),
      justifyContent: "center",
      alignItems: "center",
      marginRight: scale(10),
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(10),
    },
    tickEmpty: { borderWidth: scale(1), borderColor: theme.colors.slateCharcoal },
    tickFilled: { backgroundColor: theme.colors.primary.main },
    optionText: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    sectionInfo: {
      marginTop: verticalScale(20),
      marginBottom: verticalScale(20),
      maxWidth: scale(320),
      marginHorizontal: "auto",
    },
    sectionInfoText: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.primary.dark,
      textAlign: "center",
    },
    bottomButtonContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: verticalScale(28),
      backgroundColor: theme.colors.background.default,
    },
    browseButton: {
      borderRadius: moderateScale(50),
      height: verticalScale(60),
      justifyContent: "center",
      alignItems: "center",
    },
  });
