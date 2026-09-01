import React, { useState, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CommentItem } from "@/components/comment/CommentItem";
import { CommentInput } from "@/components/comment/CommentInput";
import { useTheme } from "@/theme";
import { useInfiniteReplies } from "@/hooks/queries/useComments";
import type { Comment } from "@/types/comment.types";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/**
 * RepliesScreen - Full screen for viewing all replies to a parent comment
 *
 * Route: /replies/[commentId]
 *
 * Features:
 * - Shows parent comment at top
 * - Displays all replies with infinite scroll
 * - Allows adding new replies
 * - Pull to refresh
 * - Optimized FlatList performance
 */
const RepliesScreen: React.FC = () => {
  const { commentId } = useLocalSearchParams<{ commentId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [replyToCommentId, setReplyToCommentId] = useState<string | undefined>();

  // Fetch replies with infinite scroll
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteReplies(commentId);

  // Flatten pages into single array
  const replies = data?.pages.flatMap((page) => page.replies) ?? [];
  const parentComment = data?.pages[0]?.parentComment;

  const handleReply = useCallback((replyCommentId: string) => {
    setReplyToCommentId(replyCommentId);
  }, []);

  const handleCommentCreated = useCallback(() => {
    setReplyToCommentId(undefined);
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/community");
    }
  }, [router]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentItem comment={item} onReply={handleReply} isNested showRepliesButton={false} />
    ),
    [handleReply],
  );

  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderHeader = useCallback(() => {
    if (!parentComment) return null;

    return (
      <>
        <View style={styles.parentCommentContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            Original Comment
          </Text>
          <CommentItem comment={parentComment} onReply={handleReply} showRepliesButton={false} />
        </View>
        <View style={styles.repliesSeparator}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            Replies ({replies.length})
          </Text>
        </View>
      </>
    );
  }, [parentComment, replies.length, handleReply, theme]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
          No replies yet. Be the first to reply!
        </Text>
      </View>
    ),
    [theme],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary.main} />
      </View>
    );
  }, [isFetchingNextPage, theme]);

  if (!commentId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error.main }]}>
            Comment ID is required
          </Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.primary.main }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={handleClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backButtonText, { color: theme.colors.primary.main }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Replies</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Replies List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading replies...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error.main }]}>
            Failed to load replies. Pull to refresh.
          </Text>
        </View>
      ) : (
        <FlatList
          data={replies}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary.main}
              colors={[theme.colors.primary.main]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={15}
        />
      )}

      {/* Comment Input */}
      <CommentInput
        postId={parentComment?.postId || ""}
        parentCommentId={commentId}
        placeholder="Write a reply..."
        onCommentCreated={handleCommentCreated}
        autoFocus={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: scale(1),
  },
  backButton: {
    paddingVertical: verticalScale(8),
    paddingRight: scale(16),
  },
  backButtonText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  headerTitle: {
    fontFamily: "Manrope-Bold",
    fontSize: moderateScale(18),
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: scale(60), // Match back button width for centering
  },
  listContainer: {
    padding: verticalScale(16),
    flexGrow: 1,
  },
  parentCommentContainer: {
    marginBottom: verticalScale(24),
    paddingBottom: verticalScale(16),
    borderBottomWidth: scale(1),
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  repliesSeparator: {
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontFamily: "Manrope-SemiBold",
    fontSize: moderateScale(12),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: verticalScale(12),
  },
  separator: {
    height: verticalScale(16),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(48),
  },
  emptyText: {
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(14),
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(14),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(32),
  },
  errorText: {
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(14),
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  closeButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
  },
  closeButtonText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: verticalScale(20),
    alignItems: "center",
  },
});

export default memo(RepliesScreen);
