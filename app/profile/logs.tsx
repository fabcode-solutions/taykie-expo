import { SafeAreaScreen, ThemeText } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import EmptyView from "@/components/ui/empty-view";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAlert } from "@/provider/AlertProvider";
import { useScheduleStore } from "@/stores/scheduleStore";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LogsData } from "@/types/schedule.types";
import { AlertPresets } from "@/utils/alert";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const LogsScreen = () => {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { fetchUserLogs, userLogs, deleteUserLog, isLoading } = useScheduleStore();

  const handleBack = useCallback(() => router.back(), [router]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      await fetchUserLogs();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const handleRemoveLog = useCallback(
    async (id: string) => {
      try {
        const message = await deleteUserLog(id);
        alert.show(AlertPresets.error(t(LocalizedStrings.common.success), message));
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [t],
  );

  return (
    <SafeAreaScreen style={styles.safeArea} showLoader={isLoading}>
      <View>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>
      </View>

      <ThemeText variant="manrope.h2" style={styles.header}>
        {t(LocalizedStrings.logs.myLogs)}
      </ThemeText>
      <FlatList
        data={userLogs}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <LogItem item={item} onRemove={handleRemoveLog} />}
        contentContainerStyle={{ gap: verticalScale(16) }}
        ListEmptyComponent={<EmptyView message={t(LocalizedStrings.logs.no_logs_found)} />}
      />
    </SafeAreaScreen>
  );
};

const LogItem = memo(({ item, onRemove }: { item: LogsData; onRemove: (id: string) => void }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, styles.row, styles.border]}>
      <View style={{ maxWidth: "80%" }}>
        <ThemeText variant="manrope.body2">{item.logDate}</ThemeText>
        <ThemeText variant="manrope.body1Bold">{`${item.note} (${item.status})`}</ThemeText>
        <ThemeText variant="manrope.body2">{item.schedule.name}</ThemeText>
      </View>
      <TouchableOpacity style={styles.editButton} onPress={() => onRemove(item.id)}>
        <Text style={styles.editButtonText}>{t(LocalizedStrings.common.remove)}</Text>
      </TouchableOpacity>
    </View>
  );
});

LogItem.displayName = "LogItem";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      gap: verticalScale(30),
      padding: verticalScale(25),
      paddingBottom: 0,
    },
    container: {
      justifyContent: "space-between",
      padding: verticalScale(20),
      gap: scale(10),
      backgroundColor: theme.colors.background.elevated,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    border: {
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
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
    editButtonText: {
      color: theme.colors.white,
      fontSize: moderateScale(12),
      textAlign: "center",
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    editButton: {
      backgroundColor: theme.colors.error.main,
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(8),
      borderRadius: moderateScale(5),
    },
  });
export default LogsScreen;
