"use client";

import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { BottomDrawer } from "../BottomDrawer";
import { CommentInput } from "./CommentInput";
import { useTheme } from "@/theme";
import { CommentItem } from "./CommentItem";
import { usePostStore } from "@/stores/postStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { Loader } from "../shared/loader";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTranslation } from "react-i18next";
import { moderateScale, verticalScale } from "@/utils/scale";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

interface CommentsBottomDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  postId: string;
  postAuthorId?: string;
}

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

  const {
    postComments,
    fetchCommentReplies,
    addCommentToPost,
    replyToCommmentWithId,
    isLoading: loadingComments,
  } = usePostStore();

  const user = useAuthStore((s) => s.user);
  const { sendNotification, isLoading } = useNotificationStore();

  // CLEANUP: Reset only when the drawer is fully closed to avoid
  // Hermes TypeError during animation
  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => {
        usePostStore.setState({ postComments: [] });
        setReplyToCommentId(undefined);
        setActiveCommentId(null);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  const handleCommentSubmit = useCallback(
    async (content: string) => {
      try {
        const recipientId = postAuthorId || postComments?.[0]?.userId;

        if (replyToCommentId) {
          await replyToCommmentWithId(postId, { content, parentCommentId: replyToCommentId });
        } else {
          await addCommentToPost(postId, content);
        }

        await fetchReplies(replyToCommentId);

        if (recipientId && recipientId !== user?.id) {
          await sendNotification({
            fromUserId: user?.id || "",
            toUserId: recipientId,
            type: "Comment",
            heading: t(LocalizedStrings.community.post.new_comment),
            context: t("community.post.user_commented", { user: user?.firstName }),
          });
        }
        setReplyToCommentId(undefined);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [
      replyToCommentId,
      user,
      postComments,
      postId,
      postAuthorId,
      addCommentToPost,
      replyToCommmentWithId,
      sendNotification,
      t,
    ],
  );

  const fetchReplies = useCallback(
    async (id: string) => {
      try {
        await fetchCommentReplies(id);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [fetchCommentReplies, t],
  );

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={onClose}
      title={t(LocalizedStrings.community.post.comments)}
      height="85%"
      showHandle
      closeOnBackdropPress
      contentStyle={styles.drawerContent}
    >
      {/* FIX: Moving KeyboardAvoidingView INSIDE the drawer and 
         using behavior="height" is more stable for Fabric/Yoga.
      */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? verticalScale(60) : 0}
      >
        {(loadingComments || isLoading) && <Loader />}

        <FlatList
          data={postComments || []}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              onReply={(id) => {
                setReplyToCommentId(id);
                inputRef.current?.focus();
              }}
              onLike={() => {}}
              onViewReplies={async (id) => {
                if (activeCommentId === id) setActiveCommentId(null);
                else {
                  setActiveCommentId(id);
                  await fetchReplies(id);
                }
              }}
              activeCommentId={activeCommentId}
            />
          )}
          keyExtractor={(item, index) => item?.id?.toString() || `comment-${index}`}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                {t(LocalizedStrings.community.placeHolder.noComments)}
              </Text>
            </View>
          )}
          removeClippedSubviews={Platform.OS === "android"} // Helps with Android list stability
        />

        <CommentInput
          postId={postId}
          inputRef={inputRef}
          parentCommentId={replyToCommentId}
          placeholder={
            replyToCommentId ? "Write a reply..." : t(LocalizedStrings.community.post.whatYouThink)
          }
          onCommentCreated={handleCommentSubmit}
        />
      </KeyboardAvoidingView>
    </BottomDrawer>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    paddingHorizontal: 0,
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
