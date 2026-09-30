import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaScreen, ThemeText } from "@/components/primitives";
import { useTheme, fontFamily, type Theme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import i18n, { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { PublicProfile, useAuthStore } from "@/stores/authStore";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationRequest } from "@/services/api/notification";
import { usePostStore } from "@/stores/postStore";
import EmptyView from "@/components/ui/empty-view";
import PostCard from "@/components/social/PostCard";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { PostCardSkeleton } from "@/components/social/PostCardSkeleton";
import { PublicProfileHeaderSkeleton } from "@/components/profile/ProfileSkeletons";
import { CommunityPost } from "@/types/posts.types";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getInitials = (name: string) => {
  if (!name) return "?"; // Fallback if name is also missing
  const names = name.trim().split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const keyExtractor = (item: CommunityPost, index: number) =>
  item?.id?.toString() || `fallback-${index}`;

const handleBack = () => router.back();

// "Joined <Month Year>", or null when the date is missing/invalid (instead of rendering
// "Invalid Date").
const formatJoined = (createdAt?: string) => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
};

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

// ─── Profile Details ──────────────────────────────────────────────────────────

interface ProfileDetailsProps {
  profile: PublicProfile;
  isOwnProfile: boolean;
  isFollowBusy: boolean;
  onFollowToggle: () => void;
  theme: Theme;
}

// Everything under the back button once the profile is loaded. Memoized so pagination
// / refresh state changes don't re-render the profile header.
const ProfileDetails = memo(function ProfileDetails({
  profile,
  isOwnProfile,
  isFollowBusy,
  onFollowToggle,
  theme,
}: ProfileDetailsProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profileUser = profile.user;
  const fullName = `${profileUser?.firstName ?? ""} ${profileUser?.lastName ?? ""}`.trim();
  const displayHandle = profileUser?.username ? `@${profileUser.username}` : profileUser?.email;
  const joined = formatJoined((profileUser as { createdAt?: string })?.createdAt);

  return (
    <>
      {/* Avatar + stats row */}
      <View style={styles.heroRow}>
        <View style={styles.avatarContainer}>
          {profileUser?.avatarUrl ? (
            <Image
              source={{ uri: profileUser.avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
              accessibilityLabel={t(LocalizedStrings.accessibility.avatarOf, { name: fullName })}
            />
          ) : (
            <ThemeText variant="manrope.h5" style={styles.avatarInitials}>
              {getInitials(fullName)}
            </ThemeText>
          )}
        </View>
        <View style={styles.statsRow}>
          <StatItem
            label={t(LocalizedStrings.profile.filter.posts)}
            value={profile.stats?.postsCount ?? 0}
            theme={theme}
          />
          <View style={styles.statDivider} />
          <StatItem
            label={t(LocalizedStrings.follow.followers)}
            value={profile.stats?.followersCount ?? 0}
            theme={theme}
          />
          <View style={styles.statDivider} />
          <StatItem
            label={t(LocalizedStrings.follow.following)}
            value={profile.stats?.followingCount ?? 0}
            theme={theme}
          />
        </View>
      </View>
      <View>
        <ThemeText style={styles.fullName}>{fullName}</ThemeText>
        <ThemeText style={styles.handle}>{displayHandle}</ThemeText>
      </View>

      {/* `!!`: an empty string with `&&` renders a bare string inside a View, which is a
          fatal "Text strings must be rendered within a <Text>" crash. */}
      {!!profileUser?.bio && <ThemeText style={styles.bio}>{profileUser.bio}</ThemeText>}

      <View style={styles.metaContainer}>
        {!!profileUser?.country && (
          <InfoRow icon="location-outline" text={profileUser.country} theme={theme} />
        )}
        {!!profileUser?.gender && (
          <InfoRow icon="person-outline" text={profileUser.gender} theme={theme} />
        )}
        {!!joined && (
          <InfoRow
            icon="calendar-outline"
            text={t(LocalizedStrings.profile.joined, { date: joined })}
            theme={theme}
          />
        )}
      </View>

      {!isOwnProfile && (
        <TouchableOpacity
          style={[styles.followButton, profile.isFollowing && styles.followingButton]}
          onPress={onFollowToggle}
          disabled={isFollowBusy}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ busy: isFollowBusy }}
        >
          {/* Spinner inside the button instead of a full-screen overlay that
              mounts/unmounts beside the list (the RN 0.79 Yoga-crash pattern). */}
          {isFollowBusy ? (
            <ActivityIndicator
              size="small"
              color={profile.isFollowing ? theme.colors.slateCharcoal : theme.colors.white}
            />
          ) : (
            <ThemeText
              style={[styles.followButtonText, profile.isFollowing && styles.followingButtonText]}
            >
              {profile.isFollowing
                ? t(LocalizedStrings.follow.unfollow)
                : t(LocalizedStrings.follow.title)}
            </ThemeText>
          )}
        </TouchableOpacity>
      )}
    </>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PublicProfileScreen = () => {
  const theme = useTheme();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const publicProfile = useAuthStore((s) => s.publicProfile);
  const fetchPublicProfile = useAuthStore((s) => s.fetchPublicProfile);
  const followUserId = useAuthStore((s) => s.followUserId);
  const unFollowUserId = useAuthStore((s) => s.unFollowUserId);
  const user = useAuthStore((s) => s.user);
  const otherUserPosts = usePostStore((s) => s.otherUserPosts);
  const fetchPostsByUserId = usePostStore((s) => s.fetchPostsByUserId);
  const hasMore = usePostStore((s) => s.hasMore);
  const isPostLoading = usePostStore((s) => s.isLoading);
  const fetchPostComments = usePostStore((s) => s.fetchPostComments);
  const sendNotification = useNotificationStore((s) => s.sendNotification);
  // Follow/unfollow shares authStore.isLoading with the profile fetch, so it has its own
  // flag (shown as a spinner inside the follow button).
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // True until this screen's first profile + posts load finishes — drives the skeletons.
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // fetchPublicProfile sets publicProfile to null for the duration of every fetch —
  // including the refetch after follow/unfollow and pull-to-refresh. Keep showing the
  // last loaded profile for THIS user meanwhile, so the header doesn't flash back to a
  // skeleton (or blank) on every follow tap.
  const lastProfileRef = useRef<PublicProfile | null>(null);
  if (publicProfile && publicProfile.user?.id === userId) {
    lastProfileRef.current = publicProfile;
  }
  const shownProfile =
    publicProfile ?? (lastProfileRef.current?.user?.id === userId ? lastProfileRef.current : null);

  const createNotification = useCallback(
    async (request: NotificationRequest) => {
      try {
        await sendNotification(request);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [sendNotification, alert],
  );

  const loadData = useCallback(
    async (refresh: boolean) => {
      try {
        await fetchPublicProfile(userId);
        await fetchPostsByUserId(userId, refresh);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [userId, fetchPublicProfile, fetchPostsByUserId, alert],
  );

  const handleFollowUnFollow = useCallback(async () => {
    setIsFollowBusy(true);
    try {
      let message = "";
      let request: NotificationRequest = {
        fromUserId: user?.id as string,
        toUserId: userId,
        type: "Follow",
        heading: t(LocalizedStrings.follow.new_follower),
        context: t("follow.started_following", { user: user?.firstName }),
      };
      if (!shownProfile?.isFollowing) {
        message = await followUserId(userId);
      } else {
        request = {
          ...request,
          heading: t(LocalizedStrings.follow.unfollowed_you),
          context: t(LocalizedStrings.follow.unfollowed_user, { user: user?.firstName }),
        };
        message = await unFollowUserId(userId);
      }
      await createNotification(request);
      await fetchPublicProfile(userId);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    } finally {
      setIsFollowBusy(false);
    }
  }, [
    shownProfile?.isFollowing,
    user?.id,
    user?.firstName,
    userId,
    followUserId,
    unFollowUserId,
    fetchPublicProfile,
    createNotification,
    alert,
  ]);

  useEffect(() => {
    let active = true;
    setIsInitialLoading(true);
    loadData(true).finally(() => {
      if (active) setIsInitialLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const handleAuthorPress = useCallback(
    (authorId: string) => {
      // Already on this author's profile — only navigate if it's someone else.
      if (authorId && authorId !== userId) {
        router.push({ pathname: "/profile/public-profile", params: { userId: authorId } });
      }
    },
    [userId],
  );

  const handleApiComment = useCallback(
    async (postId: string) => {
      try {
        await fetchPostComments(postId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [fetchPostComments, alert],
  );

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard post={item} onAuthorPress={handleAuthorPress} onApiComment={handleApiComment} />
    ),
    [handleAuthorPress, handleApiComment],
  );

  const handleLoadMore = useCallback(async () => {
    if (!isPostLoading && hasMore && !isFetchingMore && otherUserPosts.length > 0) {
      setIsFetchingMore(true);
      await fetchPostsByUserId(userId, false);
      setIsFetchingMore(false);
    }
  }, [isPostLoading, hasMore, isFetchingMore, otherUserPosts.length, fetchPostsByUserId, userId]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );

  // Header, footer and empty state are memoized ELEMENTS whose outer wrappers always
  // stay mounted — only their contents swap (skeleton ↔ real). Remounting whole
  // subtrees beside a FlatList is the trigger for the RN 0.79 Fabric/Yoga assertion
  // crash seen on the community/home screens.
  const profileHeader = useMemo(
    () => (
      <View style={styles.headerWrapper}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>
        <View style={styles.headerWrapper}>
          {shownProfile ? (
            <ProfileDetails
              profile={shownProfile}
              isOwnProfile={user?.id === userId}
              isFollowBusy={isFollowBusy}
              onFollowToggle={handleFollowUnFollow}
              theme={theme}
            />
          ) : (
            <PublicProfileHeaderSkeleton />
          )}
        </View>
        <ThemeText variant="manrope.h5" style={styles.postsHeading}>
          {t(LocalizedStrings.profile.filter.posts)}
        </ThemeText>
      </View>
    ),
    [styles, shownProfile, user?.id, userId, isFollowBusy, handleFollowUnFollow, theme],
  );

  const footerElement = useMemo(
    () => <View>{isFetchingMore ? <PostCardSkeleton /> : null}</View>,
    [isFetchingMore],
  );

  const showPostsSkeleton = isInitialLoading || (isPostLoading && !refreshing && !isFetchingMore);

  const emptyElement = useMemo(
    () => (
      <View>
        {showPostsSkeleton ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : (
          <EmptyView message={t(LocalizedStrings.community.placeHolder.no_posts_found)} />
        )}
      </View>
    ),
    [showPostsSkeleton],
  );

  return (
    <SafeAreaScreen
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
    >
      <FlatList
        data={otherUserPosts}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        renderItem={renderPostItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        ListHeaderComponent={profileHeader}
        ListFooterComponent={footerElement}
        ListEmptyComponent={emptyElement}
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
    headerWrapper: {
      gap: verticalScale(24),
    },
    postsHeading: {
      marginTop: verticalScale(16),
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
