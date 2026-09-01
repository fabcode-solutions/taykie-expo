import React, { memo, useCallback } from "react";
import { View, FlatList, Text, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { CommentItem } from "./CommentItem";
import type { Comment } from "@/types/comment.types";
import { useTheme } from "@/theme";
import { useInfiniteComments } from "@/hooks/queries/useComments";
import { moderateScale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface CommentListProps {
  postId: string;
  onReply: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onViewReplies?: (commentId: string) => void;
}

const CommentListComponent: React.FC<CommentListProps> = ({
  postId,
  onReply,
  onLike,
  onDelete,
  onViewReplies,
}) => {
  const theme = useTheme();

  // Use infinite query for pagination
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteComments(postId);

  // Flatten pages into single array
  const comments = data?.pages.flatMap((page) => page.comments) ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentItem
        comment={item}
        onReply={onReply}
        onLike={onLike}
        isNested={true}
        onDelete={onDelete}
        onViewReplies={onViewReplies}
        showRepliesButton={true}
      />
    ),
    [onReply, onLike, onDelete, onViewReplies],
  );

  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
          {t(LocalizedStrings.community.post.no_comment_yet)}
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

  const renderLoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary.main} />
      <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
        {t(LocalizedStrings.community.post.loading_comments)}
      </Text>
    </View>
  );

  const renderErrorComponent = () => (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: theme.colors.error.main }]}>
        {t(LocalizedStrings.community.post.load_comments_failed)}
      </Text>
    </View>
  );

  if (isLoading) {
    return renderLoadingComponent();
  }

  if (error) {
    return renderErrorComponent();
  }

  return (
    <FlatList
      data={comments}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={renderEmptyComponent}
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
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: verticalScale(16),
    flexGrow: 1,
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
    paddingVertical: verticalScale(48),
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: "Manrope-Medium",
    fontSize: verticalScale(14),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(48),
  },
  errorText: {
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(14),
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: verticalScale(20),
    alignItems: "center",
  },
});

export const CommentList = memo(CommentListComponent);
