"use client";

import React, { useCallback, useEffect } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
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
import ProfilePostItem from "@/components/profile/ProfilePostItem";
import { PostCardSkeleton } from "@/components/social/PostCardSkeleton";
import { verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { NotificationRequest } from "@/services/api/notification";
import { router } from "expo-router";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { CommunityFilter, CommunityPost } from "@/types/posts.types";
import SuggestedGroupsRow from "@/components/groups/SuggestedGroupsRow";
import TipsRow from "@/components/tips/TipsRow";
import { useQueryClient } from "@tanstack/react-query";
import { tipKeys } from "@/hooks/queries/tips";
import { useGroupStore } from "@/stores/groupStore";

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

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// ─── Mixed feed: posts with group-suggestion and health-tip blocks ───────────
//
// Layout: 4 posts → groups → 5 posts → tips → 5 posts → groups → 5 posts → tips → …
// Each repeated block shows the NEXT set of groups / tips (see cycleWindow), so the
// feed doesn't show the same cards twice in a row.
const FIRST_BLOCK_AFTER_POSTS = 4;
const POSTS_BETWEEN_BLOCKS = 5;
const GROUPS_PER_BLOCK = 6;
const TIPS_PER_BLOCK = 5;

type FeedItem =
  | { kind: "post"; post: CommunityPost }
  | { kind: "groups"; slot: number }
  | { kind: "tips"; slot: number };

const buildFeed = (posts: CommunityPost[], withBlocks: boolean): FeedItem[] => {
  const items: FeedItem[] = posts.map((post) => ({ kind: "post" as const, post }));
  if (!withBlocks || posts.length === 0) return items;

  const feed: FeedItem[] = [];
  let nextBlockAt = FIRST_BLOCK_AFTER_POSTS;
  let blockIndex = 0;
  posts.forEach((post, index) => {
    feed.push({ kind: "post", post });
    // Only between posts (never dangling after the last loaded one) — the next page
    // of posts will bring the next block along with it.
    if (index + 1 === nextBlockAt && index + 1 < posts.length) {
      const slot = Math.floor(blockIndex / 2);
      feed.push(blockIndex % 2 === 0 ? { kind: "groups", slot } : { kind: "tips", slot });
      blockIndex += 1;
      nextBlockAt += POSTS_BETWEEN_BLOCKS;
    }
  });

  // A short feed (all posts fit before the first block) still gets groups + tips at
  // the end, instead of never showing them.
  if (posts.length <= FIRST_BLOCK_AFTER_POSTS) {
    feed.push({ kind: "groups", slot: 0 }, { kind: "tips", slot: 0 });
  }
  return feed;
};

const keyExtractor = (item: FeedItem, index: number) => {
  if (item.kind === "post") return item.post?.id?.toString() || `fallback-${index}`;
  return `${item.kind}-${item.slot}`;
};

const handleCreatePost = () => router.push("/(screens)/create-post");

export default function CommunityScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  // Per-field selectors so unrelated post-store updates don't re-render the feed.
  const searchUserPosts = usePostStore((s) => s.searchUserPosts);
  const fetchUserPosts = usePostStore((s) => s.fetchUserPosts);
  const hasMore = usePostStore((s) => s.hasMore);
  const isLoading = usePostStore((s) => s.isLoading);
  const userPosts = usePostStore((s) => s.userPosts);
  const fetchPostComments = usePostStore((s) => s.fetchPostComments);
  const likePost = usePostStore((s) => s.likePost);
  const unLikePost = usePostStore((s) => s.unLikePost);
  const bookmarkPost = usePostStore((s) => s.bookmarkPost);
  const unBookmarkPost = usePostStore((s) => s.unBookmarkPost);
  const voteOnPollPost = usePostStore((s) => s.voteOnPollPost);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  // Tracked locally rather than via the store's isLoading, which other post actions
  // (create, report, ...) also toggle — those shouldn't blank the feed into skeletons.
  const [isFeedLoading, setIsFeedLoading] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const user = useAuthStore((s) => s.user);
  const sendNotification = useNotificationStore((s) => s.sendNotification);
  const fetchRecommendedGroups = useGroupStore((s) => s.fetchRecommendedGroups);
  const queryClient = useQueryClient();

  // Recommended groups are fetched once here for every groups block in the feed
  // (the rows use autoFetch={false}); tips blocks share one react-query query.
  useEffect(() => {
    fetchRecommendedGroups().catch(() => {});
  }, [fetchRecommendedGroups]);
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
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [activeFilter, searchText, searchUserPosts, fetchUserPosts, t, alert],
  );

  // Filter/search change: replace the list with skeletons until the new page lands.
  const loadFresh = useCallback(async () => {
    setIsFeedLoading(true);
    await loadData(true);
    setIsFeedLoading(false);
  }, [loadData]);

  useEffect(() => {
    // If searching, use debounce
    if (searchText.trim().length > 0) {
      const delayDebounceFn = setTimeout(() => {
        loadFresh();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }

    // If not searching, just load based on filter
    loadFresh();

    // Only re-run when the filter or text changes (loadFresh changes with them anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, searchText]);

  // 3. Handle Pull-to-Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Suggested groups + tips refresh alongside the feed; a failure there only
    // leaves the old suggestions showing, never blocks the feed refresh.
    await Promise.all([
      loadData(true),
      fetchRecommendedGroups().catch(() => {}),
      queryClient.invalidateQueries({ queryKey: tipKeys.all }).catch(() => {}),
    ]);
    setIsRefreshing(false);
  }, [loadData, fetchRecommendedGroups, queryClient]);

  const handleLoadMore = useCallback(async () => {
    if (!isLoading && hasMore && !isFetchingMore && userPosts.length > 0) {
      setIsFetchingMore(true);
      await loadData(false);
      setIsFetchingMore(false);
    }
  }, [isLoading, hasMore, isFetchingMore, userPosts.length, loadData]);

  const handleApiLike = useCallback(
    async (postId: string, isLiked: boolean, userId: string) => {
      try {
        let request: NotificationRequest = {
          fromUserId: user?.id as string,
          toUserId: userId,
          type: "Like",
          heading: t(LocalizedStrings.community.post.new_like),
          context: t(LocalizedStrings.community.post.user_liked_post, { user: user?.firstName }),
        };
        if (isLiked) {
          await unLikePost(postId);
          request = {
            ...request,
            heading: t(LocalizedStrings.community.post.unliked_post),
            context: t(LocalizedStrings.community.post.user_unliked_post, {
              user: user?.firstName,
            }),
          };
        } else {
          await likePost(postId);
        }
        await sendNotification(request);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [likePost, unLikePost, sendNotification, user?.id, user?.firstName, t, alert],
  );

  const handleApiComment = useCallback(
    async (postId: string) => {
      try {
        await fetchPostComments(postId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [fetchPostComments, t, alert],
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
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [bookmarkPost, unBookmarkPost, t, alert],
  );

  const handleApiPollSubmit = useCallback(
    async (postId: string, optionId: string) => {
      try {
        await voteOnPollPost(postId, optionId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [voteOnPollPost, t, alert],
  );

  const handleMenuPress = useCallback((_postId: string) => {}, []);

  const handleAuthorPress = useCallback((authorId: string) => {
    router.push({
      pathname: "/profile/public-profile",
      params: {
        userId: authorId,
      },
    });
  }, []);

  const handleSelectFilter = useCallback((key: string | string[]) => {
    setActiveFilter(key as CommunityFilter);
  }, []);

  // ProfilePostItem is memoized and gives PostCard a stable per-post like handler —
  // the old inline `onApiLike={(...) => ...}` created a new function per row per
  // render, which defeated PostCard's memo.
  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.kind === "groups") {
        return (
          <View style={themedStyles.feedBlock}>
            <SuggestedGroupsRow slot={item.slot} count={GROUPS_PER_BLOCK} autoFetch={false} />
          </View>
        );
      }
      if (item.kind === "tips") {
        // Admin health tips — renders nothing for users who didn't opt in.
        return (
          <View style={themedStyles.feedBlock}>
            <TipsRow slot={item.slot} count={TIPS_PER_BLOCK} />
          </View>
        );
      }
      return (
        <View style={themedStyles.postItem}>
          <ProfilePostItem
            post={item.post}
            onLike={handleApiLike}
            onComment={handleApiComment}
            onShare={handleApiShare}
            onPollSubmit={handleApiPollSubmit}
            onMenuPress={handleMenuPress}
            onAuthorPress={handleAuthorPress}
          />
        </View>
      );
    },
    [
      themedStyles.feedBlock,
      themedStyles.postItem,
      handleApiLike,
      handleApiComment,
      handleApiShare,
      handleApiPollSubmit,
      handleMenuPress,
      handleAuthorPress,
    ],
  );

  const showSkeleton = isFeedLoading;

  // Footer + empty state are passed to FlatList as memoized ELEMENTS, not functions:
  // a function is rendered as `<ListFooterComponent />`, so every new function identity
  // would remount the footer's native views. As elements, only their children update.
  const footerElement = React.useMemo(() => {
    return (
      <View style={themedStyles.postItem}>
        {isFetchingMore ? <PostCardSkeleton /> : <View style={themedStyles.listEnd} />}
      </View>
    );
  }, [isFetchingMore, themedStyles]);

  const emptyElement = React.useMemo(() => {
    if (showSkeleton) {
      return (
        <View style={themedStyles.postItem}>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      );
    }
    return (
      <EmptyView
        message={t(LocalizedStrings.community.placeHolder.beFirstToShare)}
        showButton
        buttonTitle={t(LocalizedStrings.community.post.createPost)}
        onPressButton={handleCreatePost}
      />
    );
  }, [showSkeleton, themedStyles.postItem, t]);

  // Groups / tips blocks are hidden while searching — suggestions aren't search results.
  const isSearching = searchText.trim().length > 0;
  const feedItems = React.useMemo(
    () => buildFeed(userPosts, !isSearching),
    [userPosts, isSearching],
  );

  const refreshControl = React.useMemo(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />,
    [isRefreshing, handleRefresh],
  );

  const searchIcon = React.useMemo(
    () => <IconSearch stroke={theme.colors.divider} />,
    [theme.colors.divider],
  );

  return (
    <SafeAreaScreen
      withBackground={false}
      style={[themedStyles.screen, themedStyles.contentContainer]}
      edges={["top"]}
    >
      <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />

      <View style={themedStyles.header}>
        <AppHeader />

        <ThemeInput
          value={searchText}
          placeholder={t(LocalizedStrings.schedule.placeHolders.search)}
          leftIcon={searchIcon}
          containerStyle={themedStyles.searchContainer}
          inputContainerStyle={themedStyles.searchInput}
          onChangeText={setSearchText}
        />
        <Tabs variant="no-bg" onSelect={handleSelectFilter} segments={filters} />
      </View>

      <FlatList
        // While a new filter/search loads, hide the previous results behind skeletons.
        data={showSkeleton ? [] : feedItems}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        renderItem={renderFeedItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={themedStyles.listContent}
        refreshControl={refreshControl}
        ListFooterComponent={footerElement}
        ListEmptyComponent={emptyElement}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
      />

      <SocialPost />
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
    header: {
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    // Groups / tips blocks inside the feed: a little breathing room around the rows.
    feedBlock: {
      paddingTop: verticalScale(8),
    },
    postItem: {
      paddingHorizontal: theme.spacing.lg,
    },
    listContent: {
      flexGrow: 1,
    },
    listEnd: {
      padding: verticalScale(20),
      alignItems: "center",
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
