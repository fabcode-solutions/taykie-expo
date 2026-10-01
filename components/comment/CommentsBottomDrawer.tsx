"use client";

import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Platform,
  FlatList,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { CommentListSkeleton } from "./CommentSkeleton";
import { BottomDrawer } from "../BottomDrawer";
import { CommentInput } from "./CommentInput";
import { useTheme } from "@/theme";
import { CommentItem } from "./CommentItem";
import { getErrorMessage, usePostStore } from "@/stores/postStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTranslation } from "react-i18next";
import { moderateScale, verticalScale } from "@/utils/scale";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import type { CommentResponse } from "@/types/posts.types";

interface CommentsBottomDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  postId: string;
  postAuthorId?: string;
}

const keyExtractor = (item: CommentResponse, index: number) =>
  item?.id?.toString() || `comment-${index}`;

const ItemSeparator = () => <View style={styles.separator} />;

const CommentsBottomDrawerComponent: React.FC<CommentsBottomDrawerProps> = ({
  isVisible,
  onClose,
  postId,
  postAuthorId,
}) => {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const [replyToCommentId, setReplyToCommentId] = useState<string | undefined>();
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Per-field selectors: every PostCard mounts one of these drawers, so subscribing to
  // the whole post store made every feed update re-render N drawers.
  const postComments = usePostStore((s) => s.postComments);
  const fetchCommentReplies = usePostStore((s) => s.fetchCommentReplies);
  const addCommentToPost = usePostStore((s) => s.addCommentToPost);
  const removeCommentFromPost = usePostStore((s) => s.removeCommentFromPost);
  const replyToCommmentWithId = usePostStore((s) => s.replyToCommmentWithId);
  const fetchMoreComments = usePostStore((s) => s.fetchMoreComments);
  const loadingComments = usePostStore((s) => s.isLoadingComments);
  const loadingMore = usePostStore((s) => s.isLoadingMoreComments);

  const userId = useAuthStore((s) => s.user?.id);
  const userFirstName = useAuthStore((s) => s.user?.firstName);
  const sendNotification = useNotificationStore((s) => s.sendNotification);

  // The drawer unmounts when closed (see PostCard), so clear the shared comment list then
  // — otherwise the next post's drawer briefly shows this post's comments.
  useEffect(
    () => () => {
      usePostStore.setState({
        postComments: [],
        postReplies: [],
        commentsPage: 1,
        hasMoreComments: false,
      });
    },
    [],
  );

  const showError = useCallback(
    (error: unknown) =>
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error))),
    [alert, t],
  );

  const loadReplies = useCallback(
    async (commentId: string) => {
      try {
        await fetchCommentReplies(commentId);
      } catch (error) {
        showError(error);
      }
    },
    [fetchCommentReplies, showError],
  );

  const handleCommentSubmit = useCallback(
    async (content: string) => {
      try {
        const parentId = replyToCommentId;
        if (parentId) {
          await replyToCommmentWithId(postId, { content, parentCommentId: parentId });
          // Show the new reply: expand the parent thread it was added to.
          setActiveCommentId(parentId);
          await loadReplies(parentId);
        } else {
          await addCommentToPost(postId, content);
        }
        setReplyToCommentId(undefined);

        const recipientId = postAuthorId || postComments?.[0]?.userId;
        if (recipientId && userId && recipientId !== userId) {
          await sendNotification({
            fromUserId: userId,
            toUserId: recipientId,
            type: "Comment",
            heading: t(LocalizedStrings.community.post.new_comment),
            context: t("community.post.user_commented", { user: userFirstName }),
          });
        }
      } catch (error) {
        showError(error);
      }
    },
    [
      replyToCommentId,
      userId,
      userFirstName,
      postComments,
      postId,
      postAuthorId,
      addCommentToPost,
      replyToCommmentWithId,
      sendNotification,
      loadReplies,
      showError,
      t,
    ],
  );

  const handleReply = useCallback((id: string) => {
    setReplyToCommentId(id);
    inputRef.current?.focus();
  }, []);

  const handleViewReplies = useCallback(
    async (id: string) => {
      if (activeCommentId === id) {
        setActiveCommentId(null);
        return;
      }
      setActiveCommentId(id);
      await loadReplies(id);
    },
    [activeCommentId, loadReplies],
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      Alert.alert(
        t(LocalizedStrings.community.post.deleteComment),
        t(LocalizedStrings.community.post.deleteCommentConfirm),
        [
          { text: t(LocalizedStrings.common.cancel), style: "cancel" },
          {
            text: t(LocalizedStrings.common.delete),
            style: "destructive",
            onPress: async () => {
              try {
                await removeCommentFromPost(postId, commentId);
                if (replyToCommentId === commentId) setReplyToCommentId(undefined);
                if (activeCommentId === commentId) {
                  setActiveCommentId(null);
                } else if (activeCommentId) {
                  // Deleted a reply: refresh the open thread so its list stays right.
                  await loadReplies(activeCommentId);
                }
              } catch (error) {
                showError(error);
              }
            },
          },
        ],
      );
    },
    [t, removeCommentFromPost, postId, activeCommentId, replyToCommentId, loadReplies, showError],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentResponse }) => (
      <CommentItem
        comment={item}
        onReply={handleReply}
        onDelete={handleDelete}
        onViewReplies={handleViewReplies}
        activeCommentId={activeCommentId}
      />
    ),
    [handleReply, handleDelete, handleViewReplies, activeCommentId],
  );

  const handleEndReached = useCallback(() => {
    fetchMoreComments(postId).catch(showError);
  }, [fetchMoreComments, postId, showError]);

  // Skeleton rows instead of a spinner/backdrop: a full set on the first load (empty
  // list), a short run as the footer while the next page loads. Comments already on
  // screen stay put when replies load or a comment is posted.
  const renderEmpty = useCallback(
    () =>
      loadingComments ? (
        <CommentListSkeleton count={6} />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
            {t(LocalizedStrings.community.placeHolder.noComments)}
          </Text>
        </View>
      ),
    [loadingComments, theme.colors.text.secondary, t],
  );
  const renderFooter = useCallback(
    () => (loadingMore ? <CommentListSkeleton count={2} /> : null),
    [loadingMore],
  );

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={onClose}
      title={t(LocalizedStrings.community.post.comments)}
      height="70%"
      showHandle
      closeOnBackdropPress
      contentStyle={styles.drawerContent}
    >
      {/* No KeyboardAvoidingView here: BottomDrawer already lifts itself above the keyboard
          and shrinks to fit, so wrapping it again double-counted the keyboard. */}
      <View style={styles.body}>
        <FlatList
          data={postComments}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={styles.list}
          removeClippedSubviews={Platform.OS === "android"}
        />

        <CommentInput
          inputRef={inputRef}
          placeholder={
            replyToCommentId
              ? t(LocalizedStrings.community.post.write_reply)
              : t(LocalizedStrings.community.post.whatYouThink)
          }
          parentCommentId={replyToCommentId}
          onCommentCreated={handleCommentSubmit}
        />
      </View>
    </BottomDrawer>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    padding: verticalScale(16),
    flexGrow: 1,
    paddingBottom: verticalScale(40),
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
});

export const CommentsBottomDrawer = memo(CommentsBottomDrawerComponent);
