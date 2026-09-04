"use client";

import React, { useCallback, useEffect } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaScreen, ThemeInput, ThemeStatusBar } from "@/components";
import { useTheme } from "@/theme/hooks";
import type { Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import IconSearch from "@/components/icons/IconSearch";
import Tabs from "@/components/shared/tabs/Tabs";
import SocialPost from "@/components/social/SocialPost";
import { usePostStore } from "@/stores/postStore";
import EmptyView from "@/components/ui/empty-view";
import PostCard from "@/components/social/PostCard";
import { verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { NotificationRequest } from "@/services/api/notification";
import { router } from "expo-router";
import { Loader } from "@/components/shared/loader";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { CommunityFilter } from "@/types/posts.types";

export const FILTERS = [
  {
    key: "new",
    label: "New",
  },
  {
    key: "popular",
    label: "Popular",
  },
  {
    key: "following",
    label: "Following",
  },
];

export default function CommunityScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const {
    searchUserPosts,
    fetchUserPosts,
    hasMore,
    isLoading,
    userPosts,
    fetchPostComments,
    likePost,
    unLikePost,
    bookmarkPost,
    unBookmarkPost,
    voteOnPollPost,
  } = usePostStore();
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const user = useAuthStore((s) => s.user);
  const { sendNotification } = useNotificationStore();
  const [activeFilter, setActiveFilter] = React.useState<CommunityFilter>("new");
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const filters = React.useMemo(
    () =>
      FILTERS.map((item) => ({
        key: item?.key,
        label: t(`community.filters.${item?.key}`),
      })),
    [t],
  );

  const loadData = useCallback(
    async (isRefresh: boolean) => {
      try {
        if (searchText.trim().length > 0) {
          await searchUserPosts(searchText, activeFilter, isRefresh);
        } else {
          await fetchUserPosts(activeFilter, isRefresh);
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [activeFilter, searchText, searchUserPosts, fetchUserPosts, t], // Dependencies are now stable actions
  );

  useEffect(() => {
    // If searching, use debounce
    if (searchText.trim().length > 0) {
      const delayDebounceFn = setTimeout(() => {
        loadData(true);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }

    // If not searching, just load based on filter
    loadData(true);

    // CRITICAL: We only want this to run when the filter or text changes.
    // Do NOT put loadData in here if it changes on every render.
  }, [activeFilter, searchText]);

  // 3. Handle Pull-to-Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(true);
    setIsRefreshing(false);
  }, [loadData]);

  const handleLoadMore = useCallback(async () => {
    if (!isLoading && hasMore && !isFetchingMore && userPosts.length > 0) {
      setIsFetchingMore(true);
      await loadData(false);
      setIsFetchingMore(false);
    }
  }, [isLoading, hasMore, isFetchingMore, userPosts, loadData]);

  const handleApiLike = useCallback(
    async (postId: string, isLiked: boolean, userId: string) => {
      try {
        let request: NotificationRequest = {
          fromUserId: user?.id,
          toUserId: userId,
          type: "Like",
          heading: "New Like",
          context: `${user?.firstName} liked your post`,
        };
        if (isLiked) {
          await unLikePost(postId);
          request = {
            ...request,
            heading: "Unliked Post",
            context: `${user?.firstName} unliked your post`,
          };
        } else {
          await likePost(postId);
        }
        await sendNotification(request);
      } catch (error) {
        console.log("Like API error:", error);
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [likePost, unLikePost, sendNotification, user?.id, user?.firstName, t],
  );

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

  const handleApiShare = useCallback(
    async (postId: string, isBookmarked: boolean) => {
      try {
        if (isBookmarked) {
          await unBookmarkPost(postId);
        } else {
          await bookmarkPost(postId);
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [bookmarkPost, unBookmarkPost, t],
  );

  const handleApiPollSubmit = useCallback(
    async (postId: string, optionId: string) => {
      console.log("API: Submit poll:", postId, "option:", optionId);
      try {
        await voteOnPollPost(postId, optionId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [voteOnPollPost, t],
  );

  const handleMenuPress = useCallback((postId: string) => {
    console.log("Menu pressed for post:", postId);
  }, []);

  const handleAuthorPress = useCallback((authorId: string) => {
    console.log("Navigate to author profile:", authorId);
    router.push({
      pathname: "/profile/public-profile",
      params: {
        userId: authorId,
      },
    });
  }, []);

  // Optimized: Extracted renderItem
  const renderPostItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PostCard
          post={item}
          onApiLike={(postId, isLiked) => handleApiLike(postId, isLiked, item?.user?.id)}
          onApiComment={handleApiComment}
          onApiShare={handleApiShare}
          onApiPollSubmit={handleApiPollSubmit}
          onMenuPress={handleMenuPress}
          onAuthorPress={handleAuthorPress}
        />
      </View>
    ),
    [
      theme.spacing.lg,
      handleApiLike,
      handleApiComment,
      handleApiShare,
      handleApiPollSubmit,
      handleMenuPress,
      handleAuthorPress,
    ],
  );

  const renderFooterComponent = useCallback(() => {
    if (isFetchingMore) return <Loader fullScreen={false} size="small" />;
    if (!hasMore && userPosts.length > 0) {
      return <View style={{ padding: verticalScale(20), alignItems: "center" }} />;
    }
    return <View />;
  }, [isFetchingMore, hasMore, userPosts.length]);

  const renderEmptyComponent = useCallback(() => {
    return (
      <EmptyView
        message={t(LocalizedStrings.community.placeHolder.beFirstToShare)}
        showButton
        buttonTitle={t(LocalizedStrings.community.post.createPost)}
        onPressButton={() => router.push("/(screens)/create-post")}
      />
    );
  }, [t]);

  const keyExtractor = useCallback(
    (item: any, index: number) => item?.id?.toString() || `fallback-${index}`,
    [],
  );

  // ScrollView has no built-in onEndReached — approximate FlatList's
  // onEndReachedThreshold by firing handleLoadMore once the scroll position
  // gets within a fixed distance of the bottom. handleLoadMore's own
  // isLoading/hasMore/isFetchingMore guards make repeated calls while
  // lingering near the bottom harmless no-ops.
  const NEAR_BOTTOM_THRESHOLD_PX = 200;
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - NEAR_BOTTOM_THRESHOLD_PX;
      if (isCloseToBottom) handleLoadMore();
    },
    [handleLoadMore],
  );
  return (
    <SafeAreaScreen
      withBackground={false}
      style={[themedStyles.screen, themedStyles.contentContainer]}
      edges={["top"]}
    >
      {isLoading && <Loader />}
      <>
        <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />

        <View style={{ paddingTop: theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
          <AppHeader />

          <ThemeInput
            value={searchText}
            placeholder={t(LocalizedStrings.schedule.placeHolders.search)}
            leftIcon={<IconSearch stroke={theme.colors.divider} />}
            containerStyle={themedStyles.searchContainer}
            inputContainerStyle={themedStyles.searchInput}
            onChangeText={setSearchText}
          />
          <Tabs
            variant="no-bg"
            onSelect={(e) => setActiveFilter(e as CommunityFilter)}
            segments={filters}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {userPosts.length === 0
            ? renderEmptyComponent()
            : userPosts.map((item, index) => (
                <React.Fragment key={keyExtractor(item, index)}>
                  {renderPostItem({ item })}
                </React.Fragment>
              ))}
          {renderFooterComponent()}
        </ScrollView>

        <SocialPost />
      </>
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      paddingBottom: theme.spacing.xxxl,
    },
    searchContainer: {
      marginTop: verticalScale(28),
      marginBottom: theme.spacing.md,
    },
    searchInput: {
      borderRadius: theme.spacing.xxxl,
      borderWidth: 0,
      height: verticalScale(40),
      backgroundColor: "rgba(255,255,255,0.9)",
    },
  });
