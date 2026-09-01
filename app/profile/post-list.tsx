import { SafeAreaScreen, ThemeText } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Loader } from "@/components/shared/loader";
import PostCard from "@/components/social/PostCard";
import SocialPost from "@/components/social/SocialPost";
import EmptyView from "@/components/ui/empty-view";
import { NotificationRequest } from "@/services/api/notification";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { usePostStore } from "@/stores/postStore";
import { fontFamily, Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { t } from "i18next";
import Tabs from "@/components/shared/tabs/Tabs";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { CommunityFilter } from "@/types/posts.types";
import { FILTERS } from "../(tabs)/community";

const PostList = () => {
  const theme = useTheme();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const user = useAuthStore((state) => state.user);
  const {
    userPosts,
    fetchUserPosts,
    bookmarkPost,
    unBookmarkPost,
    likePost,
    unLikePost,
    fetchPostComments,
    isLoading,
    hasMore,
    voteOnPollPost,
  } = usePostStore();

  const { sendNotification } = useNotificationStore();

  const [activeFilter, setActiveFilter] = useState<CommunityFilter>("new");

  const filters = useMemo(
    () =>
      FILTERS.map((item) => ({
        key: item?.key,
        label: t(`community.filters.${item?.key}`),
      })),
    [t],
  );

  useEffect(() => {
    fetchPosts(true);
  }, [activeFilter]);

  const fetchPosts = useCallback(
    async (isRefresh: boolean) => {
      try {
        await fetchUserPosts(activeFilter, isRefresh);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [activeFilter],
  );

  const handleLoadMore = useCallback(async () => {
    if (!isLoading && hasMore && !isFetchingMore && userPosts.length > 0) {
      setIsFetchingMore(true);
      await fetchPosts(false);
      setIsFetchingMore(false);
    }
  }, [isLoading, hasMore, isFetchingMore, userPosts.length, fetchPosts]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPosts(true);
    setIsRefreshing(false);
  }, [fetchPosts]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handleBookmark = useCallback(
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
    [bookmarkPost, unBookmarkPost],
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
    [voteOnPollPost],
  );

  const handleLike = useCallback(
    async (postId: string, isLiked: boolean, userId: string) => {
      try {
        let request: NotificationRequest = {
          fromUserId: user?.id,
          toUserId: userId,
          type: "Like",
          heading: t(LocalizedStrings.community.post.new_like),
          context: t("community.post.user_liked_post", { user: user?.firstName }),
        };
        if (isLiked) {
          await unLikePost(postId);
          request = {
            ...request,
            heading: t(LocalizedStrings.community.post.unliked_post),
            context: t("community.post.user_unliked_post", { user: user?.firstName }),
          };
        } else {
          await likePost(postId);
        }
        await sendNotification(request);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [likePost, unLikePost, sendNotification, user?.id, user?.firstName],
  );

  const handleApiComment = useCallback(
    async (postId: string) => {
      try {
        await fetchPostComments(postId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [fetchPostComments],
  );

  const renderFooterComponent = useCallback(() => {
    if (isFetchingMore) return <Loader fullScreen={false} />;
    if (!hasMore && userPosts.length > 0) {
      return <View style={{ padding: verticalScale(20), alignItems: "center" }} />;
    }
    return <View />;
  }, [isFetchingMore, hasMore, userPosts.length]);

  // Optimized: Extracted Empty Component
  const renderEmptyComponent = useCallback(() => {
    return (
      <EmptyView
        message={t(LocalizedStrings.community.placeHolder.beFirstToShare)}
        showButton
        buttonTitle={t(LocalizedStrings.community.post.createAPost)}
        onPressButton={() => router.push("/(screens)/create-post")}
      />
    );
  }, [isLoading]);

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
        {t(LocalizedStrings.community.post.myPosts)}
      </ThemeText>

      <Tabs
        variant="no-bg"
        onSelect={(e) => setActiveFilter(e as CommunityFilter)}
        segments={filters}
      />

      <FlatList
        data={userPosts}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onApiShare={handleBookmark}
            onApiComment={handleApiComment}
            onApiLike={(postId, isLiked) => handleLike(postId, isLiked, item?.user?.id)}
            onApiPollSubmit={handleApiPollSubmit}
            onAuthorPress={(authorId) =>
              router.push({
                pathname: "/profile/public-profile",
                params: {
                  userId: authorId,
                },
              })
            }
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListFooterComponent={renderFooterComponent}
        ListEmptyComponent={renderEmptyComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
      <SocialPost />
    </SafeAreaScreen>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      padding: verticalScale(25),
      paddingBottom: 0,
    },
    container: {
      justifyContent: "space-between",
      padding: verticalScale(20),
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
      marginVertical: verticalScale(20),
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
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    editButton: {
      backgroundColor: theme.colors.slateCharcoal,
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(8),
      borderRadius: moderateScale(5),
    },
  });
export default PostList;
