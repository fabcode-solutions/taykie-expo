import React, { memo, useMemo, useCallback, useState, useEffect } from "react";
import { View, Image, StyleSheet, TouchableOpacity, RefreshControl, FlatList } from "react-native";
import { KeyboardAvoidingSafeArea, SafeAreaScreen, ThemeText } from "@/components/primitives";
import { useTheme, fontFamily, type Theme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAuthStore } from "@/stores/authStore";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { Loader } from "@/components/shared/loader";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationRequest } from "@/services/api/notification";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { usePostStore } from "@/stores/postStore";
import EmptyView from "@/components/ui/empty-view";
import PostCard from "@/components/social/PostCard";
import IconBackArrow from "@/components/icons/IconBackArrow";

// ─── Stat Item ────────────────────────────────────────────────────────────────

const StatItem = memo<{ label: string; value: number; theme: Theme }>(({ label, value, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

  return (
    <View style={styles.statItem}>
      <ThemeText style={styles.statValue}>{formatted}</ThemeText>
      <ThemeText style={styles.statLabel}>{label}</ThemeText>
    </View>
  );
});

StatItem.displayName = "StatItem";

// ─── Info Row ─────────────────────────────────────────────────────────────────

const InfoRow = memo<{ icon: string; text: string; theme: Theme }>(({ icon, text, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as never} size={moderateScale(14)} color={theme.colors.text.secondary} />
      <ThemeText style={styles.infoText}>{text}</ThemeText>
    </View>
  );
});

InfoRow.displayName = "InfoRow";

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PublicProfileScreen = () => {
  const theme = useTheme();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { publicProfile, fetchPublicProfile, followUserId, unFollowUserId, isLoading, user } =
    useAuthStore();
  const {
    otherUserPosts,
    fetchPostsByUserId,
    hasMore,
    isLoading: isPostLoading,
    fetchPostComments,
  } = usePostStore();
  const { sendNotification, isLoading: loadingNotification } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);

  const fullName = `${publicProfile?.user?.firstName} ${publicProfile?.user.lastName}`.trim();
  const displayHandle = publicProfile?.user.username
    ? `@${publicProfile?.user.username}`
    : publicProfile?.user.email;

  const createNotification = useCallback(async (request: NotificationRequest) => {
    try {
      await sendNotification(request);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const loadData = useCallback(
    async (refresh: boolean) => {
      try {
        await fetchPublicProfile(userId);
        await fetchPostsByUserId(userId, refresh);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [userId],
  );

  const handleFollowUnFollow = useCallback(async () => {
    try {
      let message = "";
      let request: NotificationRequest = {
        fromUserId: user?.id,
        toUserId: userId,
        type: "Follow",
        heading: t(LocalizedStrings.follow.new_follower),
        context: t("follow.started_following", { user: user?.firstName }),
      };
      if (!publicProfile?.isFollowing) {
        message = await followUserId(userId);
      } else {
        request = {
          ...request,
          heading: t(LocalizedStrings.follow.unfollowed_you),
          context: t("follow.unfollowed_User", { user: user?.firstName }),
        };
        message = await unFollowUserId(userId);
      }
      await createNotification(request);
      await fetchPublicProfile(userId);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [publicProfile?.isFollowing, user, userId, t]);

  const getInitials = (name: string) => {
    if (!name) return "?"; // Fallback if name is also missing
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const handleAuthorPress = useCallback((authorId: string) => {
    console.log("Navigate to author profile:", authorId);
  }, []);

  const handleApiComment = useCallback(
    async (postId: string) => {
      try {
        await fetchPostComments(postId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
      console.log("API: Navigate to comments for post:", postId);
    },
    [fetchPostComments, t],
  );
  const renderPostItem = useCallback(
    ({ item }: { item: any }) => (
      <PostCard post={item} onAuthorPress={handleAuthorPress} onApiComment={handleApiComment} />
    ),
    [handleAuthorPress],
  );

  const renderFooterComponent = useCallback(() => {
    if (isFetchingMore) return <Loader fullScreen={false} size="small" />;
    return null; // ← remove the "end of list" empty view, it causes the blank space
  }, [isFetchingMore]);

  const renderEmptyComponent = useCallback(() => {
    return <EmptyView message={t(LocalizedStrings.community.placeHolder.no_posts_found)} />;
  }, [t]);

  const keyExtractor = useCallback(
    (item: any, index: number) => item?.id?.toString() || `fallback-${index}`,
    [],
  );

  const handleLoadMore = useCallback(async () => {
    if (!isPostLoading && hasMore && !isFetchingMore && otherUserPosts.length > 0) {
      setIsFetchingMore(true);
      await fetchPostsByUserId(userId, false);
      setIsFetchingMore(false);
    }
  }, [isPostLoading, hasMore, isFetchingMore, otherUserPosts, loadData]);

  const profileHeader = useMemo(
    () => (
      <View style={{ gap: verticalScale(24) }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>
        {/* Avatar + stats row */}
        <View style={styles.heroRow}>
          <View style={styles.avatarContainer}>
            {publicProfile?.user.avatarUrl ? (
              <Image
                source={{ uri: publicProfile?.user.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
                accessibilityLabel={`${fullName}'s avatar`}
              />
            ) : (
              <ThemeText variant="manrope.h5" style={styles.avatarInitials}>
                {getInitials(
                  `${publicProfile?.user?.firstName ?? ""} ${publicProfile?.user?.lastName ?? ""}`,
                )}
              </ThemeText>
            )}
          </View>
          <View style={styles.statsRow}>
            <StatItem label="Posts" value={publicProfile?.stats.postsCount ?? 0} theme={theme} />
            <View style={styles.statDivider} />
            <StatItem
              label="Followers"
              value={publicProfile?.stats.followersCount ?? 0}
              theme={theme}
            />
            <View style={styles.statDivider} />
            <StatItem
              label="Following"
              value={publicProfile?.stats.followingCount ?? 0}
              theme={theme}
            />
          </View>
        </View>
        <View>
          <ThemeText style={styles.fullName}>{fullName}</ThemeText>
          <ThemeText style={styles.handle}>{displayHandle}</ThemeText>
        </View>

        {publicProfile?.user.bio && (
          <ThemeText style={styles.bio}>{publicProfile.user.bio}</ThemeText>
        )}

        <View style={styles.metaContainer}>
          {publicProfile?.user.country && (
            <InfoRow icon="location-outline" text={publicProfile.user.country} theme={theme} />
          )}
          {publicProfile?.user.gender && (
            <InfoRow icon="person-outline" text={publicProfile.user.gender} theme={theme} />
          )}
          <InfoRow
            icon="calendar-outline"
            text={`Joined ${new Date(publicProfile?.user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
            theme={theme}
          />
        </View>

        {user?.id !== userId && (
          <TouchableOpacity
            style={[styles.followButton, publicProfile?.isFollowing && styles.followingButton]}
            onPress={handleFollowUnFollow}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <ThemeText
              style={[
                styles.followButtonText,
                publicProfile?.isFollowing && styles.followingButtonText,
              ]}
            >
              {publicProfile?.isFollowing
                ? t(LocalizedStrings.follow.unfollow)
                : t(LocalizedStrings.follow.title)}
            </ThemeText>
          </TouchableOpacity>
        )}

        <ThemeText variant="manrope.h5" style={{ marginTop: verticalScale(16) }}>
          {t(LocalizedStrings.profile.filter.posts)}
        </ThemeText>
      </View>
    ),
    [publicProfile, fullName, displayHandle, user, userId, theme, styles],
  );

  return (
    <SafeAreaScreen
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
    >
      {(isLoading || loadingNotification || isPostLoading) && <Loader />}

      <FlatList
        data={otherUserPosts}
        extraData={otherUserPosts}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        renderItem={renderPostItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={profileHeader}
        ListFooterComponent={renderFooterComponent}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.flatListContent}
      />
    </SafeAreaScreen>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingTop: verticalScale(40),
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background.default,
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
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: verticalScale(12),
      backgroundColor: theme.colors.background.paper,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.background.default,
    },
    topBarTitle: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(16),
      color: theme.colors.text.primary,
    },
    scrollContent: {
      paddingTop: verticalScale(20),
      paddingBottom: verticalScale(40),
    },
    // Avatar + stats
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(16),
      marginBottom: verticalScale(14),
    },

    avatarContainer: {
      aspectRatio: 1,
      height: verticalScale(90),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    avatar: {
      aspectRatio: 1,
      height: "100%",
      borderRadius: 999,
    },
    statsRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: theme.colors.background.paper,
      borderRadius: moderateScale(12),
      paddingVertical: verticalScale(12),
    },
    statItem: {
      alignItems: "center",
      gap: verticalScale(2),
    },
    statValue: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(18),
      color: theme.colors.text.primary,
    },
    statLabel: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(11),
      color: theme.colors.text.secondary,
    },
    statDivider: {
      width: 1,
      height: verticalScale(28),
      backgroundColor: theme.colors.background.default,
    },
    // Name / handle / bio
    fullName: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(20),
      color: theme.colors.text.primary,
    },
    handle: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(13),
      color: theme.colors.text.secondary,
    },
    bio: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(13),
      color: theme.colors.slateCharcoal,
      lineHeight: verticalScale(20),
    },
    bioEmpty: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(13),
      color: theme.colors.text.disabled,
      fontStyle: "italic",
    },
    // Meta rows
    metaContainer: {
      gap: verticalScale(6),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
    },
    infoText: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(13),
      color: theme.colors.text.secondary,
    },
    // Follow button
    followButton: {
      height: verticalScale(44),
      borderRadius: 999,
      backgroundColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    followingButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.slateCharcoal,
    },
    followButtonText: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(14),
      color: theme.colors.white,
    },
    followingButtonText: {
      color: theme.colors.slateCharcoal,
    },
    flatListContent: {
      flexGrow: 1,
      paddingHorizontal: scale(16),
    },

    avatarInitials: {
      textAlign: "center",
      textAlignVertical: "center", // Android
      lineHeight: verticalScale(90), // match avatarContainer height
      width: "100%",
      color: theme.colors.text.primary,
    },
  });

export default PublicProfileScreen;
