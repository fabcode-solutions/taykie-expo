import { StyleSheet, TouchableOpacity, View, Text, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import React, { useCallback, useEffect, useMemo } from "react";
import BackButton from "@/components/BackButton";
import Tabs from "@/components/shared/tabs/Tabs";
import NotificationCard from "@/components/notifications/NotificationCard";
import { NotificationData, useNotificationStore } from "@/stores/notificationStore";
import { Loader } from "@/components/shared/loader";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import EmptyView from "@/components/ui/empty-view";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons } from "@expo/vector-icons";

type PostType = "All" | "Follow" | "Like" | "Comment" | "System";

export default function NotificationScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedType, setSelectedType] = React.useState<PostType>("All");
  const {
    fetchNotifications,
    markAllAsRead,
    markAsRead,
    notifications: userNotifications,
    isLoading,
    isFetchingNextPage,
    hasMore,
    deleteNotification,
  } = useNotificationStore();

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
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [fetchNotifications],
  );

  useEffect(() => {
    fetchUserNotifications(true);
  }, [fetchUserNotifications]);

  const handleRefresh = useCallback(async () => {
    await fetchUserNotifications(true);
  }, [fetchUserNotifications]);

  const handleLoadMore = useCallback(async () => {
    // Only load more if we are not loading, have more data, AND the current filtered list isn't empty.
    if (hasMore && !isFetchingNextPage && !isLoading && filteredNotification.length > 0) {
      await fetchUserNotifications();
    }
  }, [hasMore, isFetchingNextPage, isLoading, filteredNotification.length]);

  const markAllNotificationAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [markAllAsRead]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [markAsRead],
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
  const handleTabSelect = React.useCallback((key: string) => {
    setSelectedType(key as PostType);
  }, []);

  const ListHeader = (
    <View style={{ paddingTop: verticalScale(30) }}>
      <BackButton />
      <View style={[styles.headerRow]}>
        <ThemeText variant="manrope.h2" style={styles.header}>
          {t(LocalizedStrings.settings.notifications.title)}
        </ThemeText>
        <TouchableOpacity onPress={markAllNotificationAsRead}>
          <Text style={styles.ligther}>
            {t(LocalizedStrings.settings.notifications.mark_all_read)}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: verticalScale(20) }}>
        <Tabs variant="no-bg" segments={segments} onSelect={handleTabSelect} />
      </View>
    </View>
  );

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      await handleRefresh();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: NotificationData }) => {
      const rightActions = RenderRightActions(() => handleDeleteNotification(item.id), theme);
      return (
        <ReanimatedSwipeable friction={2} rightThreshold={40} renderRightActions={rightActions}>
          <NotificationCard item={item} onPress={() => markNotificationAsRead(item.id)} />
        </ReanimatedSwipeable>
      );
    },
    [theme, handleDeleteNotification, markNotificationAsRead],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading && <Loader />}
      <FlatList
        showsVerticalScrollIndicator={false}
        data={filteredNotification}
        extraData={filteredNotification}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ gap: verticalScale(15), marginHorizontal: scale(16) }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        ListFooterComponent={isFetchingNextPage ? <Loader fullScreen={false} /> : <View />}
        ListEmptyComponent={
          <EmptyView
            message={t(LocalizedStrings.errors.no_notifications)}
            buttonTitle={t(LocalizedStrings.schedule.create)}
          />
        }
      />
    </SafeAreaView>
  );
}

const RenderRightActions = (onDelete: () => void, theme: Theme) => {
  const DeleteAction = () => {
    const styles = createStyles(theme);
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={moderateScale(22)} color={theme.colors.white} />
      </TouchableOpacity>
    );
  };

  DeleteAction.displayName = "DeleteAction";
  return DeleteAction;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      paddingTop: verticalScale(30),
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
