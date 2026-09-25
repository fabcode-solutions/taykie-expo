import { SafeAreaScreen, ThemeText } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import EmptyView from "@/components/ui/empty-view";
import { Button } from "@/components/ui/button";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAlert } from "@/provider/AlertProvider";
import { useLidEventWithDoses, useResolveLidEvent } from "@/hooks/queries/lidEvents";
import { formatOpenTime } from "@/services/notifications.service";
import { fontFamily, Theme, useTheme } from "@/theme";
import { AlertPresets } from "@/utils/alert";
import { orderDosesByProximity, toLocalDateString } from "@/utils/lidEvents";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

/**
 * "I took a dose": today's scheduled doses, nearest to the lid-open time first
 * and preselected. Several can be selected; each is logged as taken at the
 * lid-open time. Also offers "I refilled the box" for users who tapped the
 * notification body instead of one of its actions.
 */
export default function LidEventScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { eventId, openedAt: openedAtParam } = useLocalSearchParams<{
    eventId: string;
    openedAt?: string;
  }>();

  const openedAt = useMemo(() => {
    const parsed = openedAtParam ? new Date(openedAtParam) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [openedAtParam]);
  const localDate = useMemo(() => toLocalDateString(openedAt), [openedAt]);

  const { data, isLoading, isError } = useLidEventWithDoses(eventId, localDate);
  const resolve = useResolveLidEvent();

  const doses = useMemo(
    () => orderDosesByProximity(data?.doses ?? [], openedAt),
    [data?.doses, openedAt],
  );

  // Preselect the nearest dose that is not already taken, once
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (initialised || !data) return;
    const nearest = doses.find((d) => !d.isTaken);
    if (nearest) setSelected(new Set([nearest.scheduleId]));
    setInitialised(true);
  }, [data, doses, initialised]);

  const toggle = useCallback((scheduleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) next.delete(scheduleId);
      else next.add(scheduleId);
      return next;
    });
  }, []);

  const submit = useCallback(
    async (request: Parameters<typeof resolve.mutateAsync>[0]["request"]) => {
      try {
        await resolve.mutateAsync({ eventId, request });
        router.back();
      } catch (error: any) {
        alert.show(
          AlertPresets.error(
            t(LocalizedStrings.common.error),
            error?.message ?? t(LocalizedStrings.lidEvent.saveFailed),
          ),
        );
      }
    },
    [alert, eventId, resolve, t],
  );

  const alreadyAnswered = data && data.event.status !== "unconfirmed";

  return (
    <SafeAreaScreen style={styles.safeArea} showLoader={isLoading || resolve.isPending}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
        <View style={styles.backButtonInner}>
          <IconBackArrow />
        </View>
      </TouchableOpacity>

      <View style={styles.headerBlock}>
        <ThemeText variant="manrope.h2" style={styles.header}>
          {t(LocalizedStrings.lidEvent.pickerTitle)}
        </ThemeText>
        <ThemeText variant="manrope.body2" style={styles.subtitle}>
          {t(LocalizedStrings.lidEvent.pickerSubtitle, { time: formatOpenTime(openedAt) })}
        </ThemeText>
      </View>

      {isError ? (
        <EmptyView message={t(LocalizedStrings.lidEvent.loadFailed)} />
      ) : alreadyAnswered ? (
        <EmptyView message={t(LocalizedStrings.lidEvent.resolved)} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {!isLoading && doses.length === 0 && (
              <ThemeText variant="manrope.body2" style={styles.subtitle}>
                {t(LocalizedStrings.lidEvent.noDoses)}
              </ThemeText>
            )}

            {doses.map((dose) => {
              const isSelected = selected.has(dose.scheduleId);
              return (
                <TouchableOpacity
                  key={dose.scheduleId}
                  activeOpacity={0.8}
                  disabled={dose.isTaken}
                  onPress={() => toggle(dose.scheduleId)}
                  style={[
                    styles.row,
                    isSelected && styles.rowSelected,
                    dose.isTaken && styles.rowDisabled,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: dose.isTaken }}
                >
                  <View style={styles.rowText}>
                    <ThemeText variant="manrope.body1Bold">{dose.name}</ThemeText>
                    <ThemeText variant="manrope.body2" style={styles.subtitle}>
                      {[dose.dosage, dose.times.join(", ")].filter(Boolean).join(" · ")}
                    </ThemeText>
                    {dose.isTaken && (
                      <ThemeText variant="manrope.caption" style={styles.subtitle}>
                        {t(LocalizedStrings.lidEvent.alreadyTaken)}
                      </ThemeText>
                    )}
                  </View>
                  <Ionicons
                    name={isSelected || dose.isTaken ? "checkmark-circle" : "ellipse-outline"}
                    size={moderateScale(24)}
                    color={theme.colors.text.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t(LocalizedStrings.lidEvent.confirm)}
              disabled={selected.size === 0 || resolve.isPending}
              onPress={() => submit({ action: "dose", scheduleIds: [...selected] })}
            />
            <Button
              title={t(LocalizedStrings.lidEvent.refillCta)}
              variant="outline"
              disabled={resolve.isPending}
              onPress={() => submit({ action: "refill" })}
            />
          </View>
        </>
      )}
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      gap: verticalScale(16),
      padding: verticalScale(25),
      paddingBottom: verticalScale(16),
    },
    backButton: { alignSelf: "flex-start" },
    backButtonInner: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background.elevated,
    },
    headerBlock: { gap: verticalScale(6) },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    subtitle: { color: theme.colors.text.secondary2 },
    list: { gap: verticalScale(12), paddingBottom: verticalScale(12) },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: scale(12),
      padding: verticalScale(16),
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background.elevated,
    },
    rowSelected: { borderColor: theme.colors.text.primary, borderWidth: scale(2) },
    rowDisabled: { opacity: 0.55 },
    rowText: { flex: 1, gap: verticalScale(2) },
    footer: { gap: verticalScale(10) },
  });
