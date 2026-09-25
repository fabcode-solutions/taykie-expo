import { SafeAreaScreen, ThemeText } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import EmptyView from "@/components/ui/empty-view";
import { useUnconfirmedLidEvents } from "@/hooks/queries/lidEvents";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import type { LidOpenEvent } from "@/services/api/device";
import { formatOpenTime } from "@/services/notifications.service";
import { fontFamily, Theme, useTheme } from "@/theme";
import { getDateLocale } from "@/utils/date";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import { router, type Href } from "expo-router";
import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

/**
 * Lid opens the user has not answered: dismissed, ignored, or found by the F6
 * sync after the phone was away. Tapping one opens the same dose picker as the
 * notification does. Newest first.
 */
export default function UnconfirmedLidEventsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data, isLoading, refetch, isRefetching } = useUnconfirmedLidEvents();

  const events = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    [data],
  );

  const openEvent = useCallback((event: LidOpenEvent) => {
    router.push({
      pathname: "/lid-events/[eventId]",
      params: { eventId: event.id, openedAt: event.openedAt },
    } as Href);
  }, []);

  return (
    <SafeAreaScreen style={styles.safeArea} showLoader={isLoading}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
        <View style={styles.backButtonInner}>
          <IconBackArrow />
        </View>
      </TouchableOpacity>

      <View style={{ gap: verticalScale(6) }}>
        <ThemeText variant="manrope.h2" style={styles.header}>
          {t(LocalizedStrings.lidEvent.unconfirmedTitle)}
        </ThemeText>
        <ThemeText variant="manrope.body2" style={styles.subtitle}>
          {t(LocalizedStrings.lidEvent.unconfirmedSubtitle)}
        </ThemeText>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventRow event={item} onPress={openEvent} />}
        contentContainerStyle={{ gap: verticalScale(12) }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? null : <EmptyView message={t(LocalizedStrings.lidEvent.noneToConfirm)} />
        }
      />
    </SafeAreaScreen>
  );
}

const EventRow = memo(
  ({ event, onPress }: { event: LidOpenEvent; onPress: (event: LidOpenEvent) => void }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const openedAt = new Date(event.openedAt);

    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => onPress(event)}>
        <View style={{ flex: 1, gap: verticalScale(2) }}>
          <ThemeText variant="manrope.body1Bold">
            {t(LocalizedStrings.lidEvent.openedAt, {
              date: format(openedAt, "PP", { locale: getDateLocale() }),
              time: formatOpenTime(openedAt),
            })}
          </ThemeText>
          {event.openCount > 1 && (
            <ThemeText variant="manrope.caption" style={styles.subtitle}>
              {t(LocalizedStrings.lidEvent.opensMerged, { count: event.openCount })}
            </ThemeText>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={moderateScale(20)}
          color={theme.colors.text.primary}
        />
      </TouchableOpacity>
    );
  },
);
EventRow.displayName = "EventRow";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      gap: verticalScale(20),
      padding: verticalScale(25),
      paddingBottom: 0,
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
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    subtitle: { color: theme.colors.text.secondary2 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(12),
      padding: verticalScale(16),
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background.elevated,
    },
  });
