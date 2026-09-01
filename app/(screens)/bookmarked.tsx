import React, { useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaScreen, ThemeInput, ThemeStatusBar, ThemeText } from "@/components";
import { Theme, useTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import IconBackArrow from "@/components/icons/IconBackArrow";
import IconSearch from "@/components/icons/IconSearch";
import Svg, { Path } from "react-native-svg";
import PostCard from "@/components/social/PostCard";
import { usePostStore } from "@/stores/postStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { Loader } from "@/components/shared/loader";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

/**
 * EmptyState Component
 * Reusable empty state component for bookmarks
 */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  theme: Theme;
}

const EmptyState = React.memo<EmptyStateProps>(({ icon, title, description, theme }) => {
  const styles = React.useMemo(() => createEmptyStateStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>{icon}</View>
      <ThemeText variant="manrope.h4" style={styles.title}>
        {title}
      </ThemeText>
      <ThemeText variant="manrope.body2" style={styles.description}>
        {description}
      </ThemeText>
    </View>
  );
});

EmptyState.displayName = "EmptyState";

/**
 * BookmarkedScreen Component
 * Displays user's bookmarked medicines with empty state
 * TODO: Integrate with API to fetch actual bookmarked items
 */
export default function BookmarkedScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const { t } = useTranslation();
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const {
    fetchBookmarkedPosts,
    searchInBookmarkedPosts,
    fetchPostComments,
    bookmarkedPost,
    unBookmarkPost,
    isLoading,
    hasMore, // Using our isolated bookmark tracker
  } = usePostStore();

  // Local state exactly like CommunityScreen
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // 1. Stable loadData wrapper
  const loadData = useCallback(
    async (isRefresh: boolean) => {
      try {
        if (searchQuery.trim().length > 0) {
          await searchInBookmarkedPosts(searchQuery, isRefresh);
        } else {
          await fetchBookmarkedPosts(isRefresh);
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [searchQuery, t],
  );

  // 2. Initial Load
  useEffect(() => {
    // If searching, use debounce
    if (searchQuery.trim().length > 0) {
      const delayDebounceFn = setTimeout(() => {
        loadData(true);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }

    loadData(true);
  }, [searchQuery]);

  // 3. Handle Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(true);
    setIsRefreshing(false);
  }, [loadData]);

  // 4. Handle Pagination
  const handleLoadMore = useCallback(async () => {
    if (!isLoading && hasMore && !isFetchingMore && bookmarkedPost.length > 0) {
      setIsFetchingMore(true);
      await loadData(false);
      setIsFetchingMore(false);
    }
  }, [isLoading, hasMore, isFetchingMore, bookmarkedPost.length, loadData]);

  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  const handleSearch = React.useCallback(() => {
    console.log("Search bookmarks");
    setShowSearch((prev) => !prev);
  }, []);

  const handleBrowseProducts = React.useCallback(() => {
    router.push("/(tabs)/community");
  }, [router]);

  // API Handlers
  const handleApiLike = useCallback((postId: string, isLiked: boolean) => {
    console.log(`API: ${isLiked ? "Like" : "Unlike"} post:`, postId);
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

  const handleApiShare = useCallback(
    async (postId: string) => {
      try {
        await unBookmarkPost(postId);
        // We use true to refresh list and remove the unbookmarked item cleanly
        await loadData(true);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [unBookmarkPost, loadData, t],
  );

  const handleApiPollSubmit = useCallback((postId: string, optionId: string) => {
    console.log("API: Submit poll:", postId, "option:", optionId);
  }, []);

  const handleMenuPress = useCallback((postId: string) => {
    console.log("Menu pressed for post:", postId);
  }, []);

  const handleAuthorPress = useCallback((authorId: string) => {
    router.push({
      pathname: "/profile/public-profile",
      params: {
        userId: authorId,
      },
    });
  }, []);

  // Extracted renderItem just like CommunityScreen
  const renderPostItem = useCallback(
    ({ item }: { item: any }) => (
      <PostCard
        post={{ ...item, isBookmarked: true }}
        onApiLike={handleApiLike}
        onApiComment={handleApiComment}
        onApiShare={handleApiShare}
        onApiPollSubmit={handleApiPollSubmit}
        onMenuPress={handleMenuPress}
        onAuthorPress={handleAuthorPress}
      />
    ),
    [
      handleApiLike,
      handleApiComment,
      handleApiShare,
      handleApiPollSubmit,
      handleMenuPress,
      handleAuthorPress,
    ],
  );

  // Extracted Footer Component
  const renderFooterComponent = useCallback(() => {
    if (isFetchingMore) return <Loader fullScreen={false} />;
    if (!hasMore && bookmarkedPost.length > 0) {
      return <View style={{ padding: verticalScale(20), alignItems: "center" }} />;
    }
    return <View />;
  }, [isFetchingMore, hasMore, bookmarkedPost.length]);

  const keyExtractor = useCallback(
    (item: any, index: number) => item?.id?.toString() || `bookmark-fallback-${index}`,
    [],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ backgroundColor: theme.colors.background.default, flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaScreen
        withBackground={true}
        style={themedStyles.screen}
        edges={["top"]}
        showLoader={isLoading && bookmarkedPost.length === 0}
      >
        <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />

        {/* Static Header Section */}
        <View style={themedStyles.headerSection}>
          <TouchableOpacity
            onPress={handleBack}
            style={themedStyles.backButton}
            activeOpacity={0.7}
          >
            <View style={themedStyles.backButtonInner}>
              <IconBackArrow />
            </View>
          </TouchableOpacity>

          <View style={{ gap: verticalScale(20) }}>
            <View style={themedStyles.titleRow}>
              <ThemeText variant="gs.h2" style={themedStyles.pageTitle}>
                {t(LocalizedStrings.bookmarks.title)}
              </ThemeText>
              <TouchableOpacity
                onPress={handleSearch}
                style={themedStyles.searchButton}
                activeOpacity={0.7}
              >
                <IconSearch stroke={theme.colors.slateCharcoal} />
              </TouchableOpacity>
            </View>

            {showSearch && (
              <Animated.View
                style={themedStyles.searchWrapper}
                entering={FadeInDown.duration(300)}
                exiting={FadeOutDown.duration(300)}
              >
                <ThemeInput
                  placeholder={t(LocalizedStrings.groups.searchGroups)}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  leftIcon={<IconSearch />}
                  rightIcon={
                    isLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.primary.main} />
                    ) : searchQuery ? (
                      <TouchableOpacity onPress={handleClearSearch}>
                        <Ionicons
                          name="close-circle"
                          size={moderateScale(18)}
                          color={theme.colors.text.hint}
                        />
                      </TouchableOpacity>
                    ) : undefined
                  }
                  containerStyle={themedStyles.searchContainer}
                  placeholderClassName="text-[#B3B3B3] text-xs font-normal"
                  returnKeyType="search"
                />
              </Animated.View>
            )}
          </View>
        </View>

        <FlatList
          data={bookmarkedPost}
          extraData={bookmarkedPost}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          renderItem={renderPostItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={themedStyles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          ListFooterComponent={renderFooterComponent}
          ListEmptyComponent={
            <EmptyState
              icon={
                <View style={themedStyles.emptyIconContainer}>
                  <Svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <Path
                      d="M5 23.75C5.00005 20.968 5.84398 18.2515 7.42033 15.9592C8.99668 13.6669 11.2313 11.9067 13.829 10.911C16.4268 9.91536 19.2654 9.73112 21.97 10.3826C24.6747 11.0341 27.1181 12.4907 28.9775 14.56C29.1085 14.7 29.2668 14.8117 29.4427 14.888C29.6186 14.9643 29.8083 15.0037 30 15.0037C30.1917 15.0037 30.3814 14.9643 30.5573 14.888C30.7332 14.8117 30.8915 14.7 31.0225 14.56C32.8761 12.4773 35.3201 11.0084 38.0291 10.349C40.7381 9.6896 43.5837 9.87088 46.1872 10.8687C48.7906 11.8666 51.0285 13.6336 52.6028 15.9348C54.1771 18.2359 55.0133 20.9619 55 23.75C55 29.475 51.25 33.75 47.5 37.5L33.77 50.7825C33.3042 51.3175 32.7298 51.7473 32.0851 52.0433C31.4404 52.3392 30.7401 52.4946 30.0307 52.4991C29.3213 52.5036 28.6191 52.3571 27.9707 52.0693C27.3223 51.7815 26.7426 51.3591 26.27 50.83L12.5 37.5C8.75 33.75 5 29.5 5 23.75Z"
                      fill="#DADADA"
                    />
                  </Svg>
                </View>
              }
              title={t(LocalizedStrings.bookmarks.empty.title)}
              description={t(LocalizedStrings.bookmarks.empty.description)}
              theme={theme}
            />
          }
        />
      </SafeAreaScreen>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: 0,
    },
    headerSection: {
      gap: theme.spacing.lgx,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
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
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pageTitle: {
      color: theme.colors.slateCharcoal,
    },
    searchButton: {
      aspectRatio: 1,
      height: verticalScale(20),
      justifyContent: "center",
      alignItems: "center",
    },
    emptyIconContainer: {
      aspectRatio: 1,
      height: verticalScale(60),
      justifyContent: "center",
      alignItems: "center",
    },
    emptyIcon: {
      fontSize: moderateScale(60),
    },
    bottomButtonContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: verticalScale(28),
      backgroundColor: theme.colors.background.default,
    },
    browseButton: {
      backgroundColor: theme.colors.primary.main,
      borderRadius: 999,
      height: verticalScale(60),
      justifyContent: "center",
      alignItems: "center",
    },
    browseButtonText: {
      color: theme.colors.slateCharcoal,
    },
    searchWrapper: {
      overflow: "hidden",
    },
    searchContainer: {
      borderRadius: moderateScale(60),
      borderColor: theme.colors.white,
      height: verticalScale(40),
    },
  });

const createEmptyStateStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lgx,
    },
    iconContainer: {
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.slateCharcoal,
      textAlign: "center",
      marginBottom: theme.spacing.xxs,
    },
    description: {
      color: theme.colors.text.secondary,
      textAlign: "center",
      lineHeight: verticalScale(18),
    },
  });
