import { StyleSheet, TouchableOpacity, View, Text, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import React, { useCallback, useEffect, useMemo } from "react";
import BackButton from "@/components/BackButton";
import Tabs from "@/components/shared/tabs/Tabs";
import NotificationCard from "@/components/notifications/NotificationCard";
import {
  NotificationCardSkeleton,
  NotificationListSkeleton,
} from "@/components/notifications/NotificationCardSkeleton";
import { NotificationData, useNotificationStore } from "@/stores/notificationStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import EmptyView from "@/components/ui/empty-view";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons } from "@expo/vector-icons";
import { getTipIdFromNotification } from "@/services/api/tips";
import { openTip } from "@/components/tips/TipsRow";

type PostType = "All" | "Follow" | "Like" | "Comment" | "System";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const keyExtractor = (item: NotificationData) => item.id;

type ScreenStyles = ReturnType<typeof createStyles>;

interface NotificationRowProps {
  item: NotificationData;
  onRead: (item: NotificationData) => void;
  onDelete: (id: string) => void;
  styles: ScreenStyles;
  deleteIconColor: string;
}

// Memoized row: gives NotificationCard / the swipe action stable per-row handlers, so
// marking one notification read re-renders only that row, not the whole list.
const NotificationRow = React.memo(function NotificationRow({
  item,
  onRead,
  onDelete,
  styles,
  deleteIconColor,
}: NotificationRowProps) {
  const handlePress = useCallback(() => onRead(item), [onRead, item]);
  const handleDelete = useCallback(() => onDelete(item.id), [onDelete, item.id]);
  const renderRightActions = useCallback(
    () => (
      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={moderateScale(22)} color={deleteIconColor} />
      </TouchableOpacity>
    ),
    [styles.deleteAction, handleDelete, deleteIconColor],
  );

  return (
    <ReanimatedSwipeable friction={2} rightThreshold={40} renderRightActions={renderRightActions}>
      <NotificationCard item={item} onPress={handlePress} />
    </ReanimatedSwipeable>
  );
});

export default function NotificationScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedType, setSelectedType] = React.useState<PostType>("All");
  // Per-field selectors so unrelated notification-store updates don't re-render the list.
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const userNotifications = useNotificationStore((s) => s.notifications);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const isFetchingNextPage = useNotificationStore((s) => s.isFetchingNextPage);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);

  // The store's isLoading is shared with sendNotification / registerFCMToken / settings
  // calls, so the list's own loading states are tracked locally: skeletons for the
  // first load, the native pull spinner for pull-to-refresh.
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const filteredNotification = useMemo(() => {
    if (selectedType === "All") {
      return userNotifications;
    }

    return userNotifications.filter((notification) => notification.type === selectedType);
  }, [userNotifications, selectedType]);

  const fetchUserNotifications = useCallback(
    async (refresh: boolean = false) => {
      try {
        await fetchNotifications(refresh);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [fetchNotifications, alert],
  );

  useEffect(() => {
    let active = true;
    fetchUserNotifications(true).finally(() => {
      if (active) setIsInitialLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchUserNotifications]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchUserNotifications(true);
    setIsRefreshing(false);
  }, [fetchUserNotifications]);

  const handleLoadMore = useCallback(async () => {
    // Only load more if we are not loading, have more data, AND the current filtered list isn't empty.
    if (hasMore && !isFetchingNextPage && !isLoading && filteredNotification.length > 0) {
      await fetchUserNotifications();
    }
  }, [hasMore, isFetchingNextPage, isLoading, filteredNotification.length, fetchUserNotifications]);

  const markAllNotificationAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, [markAllAsRead, alert]);

  const markNotificationAsRead = useCallback(
    async (notification: NotificationData) => {
      // "New tip" notifications open the tip; everything else just marks read.
      const tipId = getTipIdFromNotification(notification);
      if (tipId) openTip(tipId);
      try {
        await markAsRead(notification.id);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [markAsRead, alert],
  );

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotification(notificationId);
        // Background refresh: the list stays on screen (no skeleton, no overlay).
        await fetchUserNotifications(true);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [deleteNotification, fetchUserNotifications, alert],
  );

  // Tab segments
  const segments = React.useMemo(
    () => [
      { key: "All", label: t(LocalizedStrings.settings.notifications.filter.All) },
      { key: "Follow", label: t(LocalizedStrings.settings.notifications.filter.Follow) },
      { key: "Like", label: t(LocalizedStrings.settings.notifications.filter.Like) },
      { key: "Comment", label: t(LocalizedStrings.settings.notifications.filter.Comment) },
      { key: "System", label: t(LocalizedStrings.settings.notifications.filter.System) },
    ],
    [],
  );

  // Handlers
  const handleTabSelect = React.useCallback((key: string | string[]) => {
    setSelectedType(key as PostType);
  }, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <BackButton />
        <View style={styles.headerRow}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t(LocalizedStrings.settings.notifications.title)}
          </ThemeText>
          <TouchableOpacity onPress={markAllNotificationAsRead}>
            <Text style={styles.ligther}>
              {t(LocalizedStrings.settings.notifications.mark_all_read)}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tabsWrapper}>
          <Tabs variant="no-bg" segments={segments} onSelect={handleTabSelect} />
        </View>
      </View>
    ),
    [styles, markAllNotificationAsRead, segments, handleTabSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationData }) => (
      <NotificationRow
        item={item}
        onRead={markNotificationAsRead}
        onDelete={handleDeleteNotification}
        styles={styles}
        deleteIconColor={theme.colors.white}
      />
    ),
    [markNotificationAsRead, handleDeleteNotification, styles, theme.colors.white],
  );

  // Footer and empty state are passed as stable ELEMENTS whose wrapper View is always
  // mounted — only the contents swap. Mounting/unmounting views next to a list (and the
  // old full-screen Loader toggling beside it) is the known trigger for the RN 0.79
  // Fabric/Yoga crash seen on the community and home screens.
  const footerElement = useMemo(
    () => <View>{isFetchingNextPage ? <NotificationCardSkeleton /> : null}</View>,
    [isFetchingNextPage],
  );

  const emptyElement = useMemo(
    () => (
      <View>
        {isInitialLoading ? (
          <NotificationListSkeleton />
        ) : (
          <EmptyView
            message={t(LocalizedStrings.errors.no_notifications)}
            buttonTitle={t(LocalizedStrings.schedule.create)}
          />
        )}
      </View>
    ),
    [isInitialLoading],
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />,
    [isRefreshing, handleRefresh],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        showsVerticalScrollIndicator={false}
        data={filteredNotification}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        ListFooterComponent={footerElement}
        ListEmptyComponent={emptyElement}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      paddingTop: verticalScale(30),
    },
    listHeader: {
      paddingTop: verticalScale(30),
    },
    tabsWrapper: {
      marginTop: verticalScale(20),
    },
    listContent: {
      gap: verticalScale(15),
      marginHorizontal: scale(16),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
      justifyContent: "space-between",
    },
    rightIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(20),
    },
    ligther: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
    },
    flatList: {
      gap: verticalScale(15),
      margin: verticalScale(16),
    },

    deleteAction: {
      backgroundColor: theme.colors.error.main,
      justifyContent: "center",
      alignItems: "center",
      width: scale(70),
      borderRadius: moderateScale(10),
      marginLeft: scale(8),
    },
  });
