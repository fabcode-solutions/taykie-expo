import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t } from "i18next";
import { ThemeText } from "@/components";
import BackButton from "@/components/BackButton";
import EmptyView from "@/components/ui/empty-view";
import { UserListSkeleton } from "@/components/profile/ProfileSkeletons";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { groupsRepo, GroupMember } from "@/services/repositories/groups";
import { followUser, unFollowUser } from "@/services/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

const PAGE_SIZE = 20;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getInitials = (name: string) => {
  const names = name.trim().split(" ").filter(Boolean);
  if (names.length === 0) return "?";
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const keyExtractor = (item: GroupMember) => item.id;

type Styles = ReturnType<typeof createStyles>;

interface MemberRowProps {
  member: GroupMember;
  isFollowing: boolean;
  isBusy: boolean;
  onPress: (userId: string) => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  styles: Styles;
}

// Memoized: toggling follow on one member must not re-render the other rows.
const MemberRow = memo(function MemberRow({
  member,
  isFollowing,
  isBusy,
  onPress,
  onToggleFollow,
  styles,
}: MemberRowProps) {
  const userId = member.user?.id ?? member.userId ?? "";
  const firstName = member.user?.firstName ?? "";
  const lastName = member.user?.lastName ?? "";
  const avatarUrl = member.user?.avatarUrl;
  const isSelf = !!member.isSelf;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowLeft}
        onPress={() => onPress(userId)}
        disabled={isSelf}
        accessibilityRole="button"
        accessibilityLabel={`${firstName} ${lastName}`.trim()}
      >
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <ThemeText variant="manrope.body1Bold">{getInitials(`${firstName} ${lastName}`)}</ThemeText>
          )}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {`${firstName} ${lastName}`.trim()}
        </Text>
      </TouchableOpacity>

      {isSelf ? (
        <Text style={styles.youLabel}>{t(LocalizedStrings.groups.you)}</Text>
      ) : (
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followBtnActive]}
          onPress={() => onToggleFollow(userId, isFollowing)}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityState={{ busy: isBusy }}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={styles.followBtnText.color} />
          ) : (
            <Text style={styles.followBtnText}>
              {isFollowing
                ? t(LocalizedStrings.follow.following)
                : t(LocalizedStrings.follow.title)}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function GroupMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const alert = useAlert();
  const user = useAuthStore((s) => s.user);
  const sendNotification = useNotificationStore((s) => s.sendNotification);

  // Local follow state layered over the server value, so a tap flips the button at once
  // (and rolls back on failure) without refetching the whole member list.
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useInfiniteQuery({
      queryKey: ["groupMembers", groupId],
      enabled: !!groupId,
      initialPageParam: 1,
      queryFn: ({ pageParam }) => groupsRepo.getGroupMembers(groupId, pageParam, PAGE_SIZE),
      getNextPageParam: (last, pages) => {
        const loaded = pages.reduce((sum, p) => sum + p.members.length, 0);
        return last.members.length > 0 && loaded < last.total ? last.page + 1 : undefined;
      },
    });

  const members = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flatMap((p) => p.members)
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [data]);
  const total = data?.pages[0]?.total ?? 0;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOpenProfile = useCallback(
    (userId: string) =>
      router.push({ pathname: "/profile/public-profile", params: { userId } }),
    [router],
  );

  const handleToggleFollow = useCallback(
    async (userId: string, isFollowing: boolean) => {
      if (!userId) return;
      setBusyIds((prev) => ({ ...prev, [userId]: true }));
      setFollowOverrides((prev) => ({ ...prev, [userId]: !isFollowing }));
      try {
        if (isFollowing) {
          await unFollowUser(userId);
        } else {
          await followUser(userId);
          // Same notification the Follow screen sends; a failure here must not undo the follow.
          sendNotification({
            fromUserId: user?.id ?? "",
            toUserId: userId,
            type: "Follow",
            heading: t(LocalizedStrings.follow.new_follower),
            context: t("follow.started_following", { user: user?.firstName }),
          }).catch(() => {});
        }
      } catch (err) {
        setFollowOverrides((prev) => ({ ...prev, [userId]: isFollowing }));
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(err)));
      } finally {
        setBusyIds((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [alert, sendNotification, user?.id, user?.firstName],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroupMember }) => {
      const userId = item.user?.id ?? item.userId ?? "";
      return (
        <MemberRow
          member={item}
          isFollowing={followOverrides[userId] ?? !!item.isFollowing}
          isBusy={!!busyIds[userId]}
          onPress={handleOpenProfile}
          onToggleFollow={handleToggleFollow}
          styles={styles}
        />
      );
    },
    [followOverrides, busyIds, handleOpenProfile, handleToggleFollow, styles],
  );

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <View style={styles.headerRow}>
        <ThemeText variant="manrope.h2" style={styles.header}>
          {t(LocalizedStrings.groups.groupMembers)}
          {total > 0 ? ` (${total})` : ""}
        </ThemeText>
      </View>

      <FlatList
        data={members}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <UserListSkeleton />
          ) : (
            <EmptyView
              title={error ? t(LocalizedStrings.common.error) : t(LocalizedStrings.groups.noMembers)}
              message={error ? getErrorMessage(error) : ""}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={theme.colors.activityIndicator} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
      gap: verticalScale(10),
    },
    headerRow: {
      marginTop: verticalScale(10),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    list: {
      paddingBottom: verticalScale(40),
    },
    footer: {
      paddingVertical: verticalScale(16),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: verticalScale(20),
      gap: scale(10),
    },
    rowLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
    },
    avatar: {
      aspectRatio: 1,
      height: verticalScale(50),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    name: {
      flex: 1,
      fontSize: moderateScale(16),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    youLabel: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.secondary,
      paddingHorizontal: scale(20),
    },
    followBtn: {
      minWidth: scale(100),
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
      borderColor: theme.colors.primary.main,
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderRadius: moderateScale(70),
    },
    followBtnActive: {
      backgroundColor: "transparent",
      borderColor: "#DADADA",
    },
    followBtnText: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
  });
