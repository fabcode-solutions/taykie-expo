import React, { useCallback, memo } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { getRelativeTime } from "@/utils/time";
import { CommentResponse } from "@/types/posts.types";
import { useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { usePostStore } from "@/stores/postStore";

import { useTranslation } from "react-i18next"; // Fixed import
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface CommentItemProps {
  comment: CommentResponse;
  onReply: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onViewReplies?: (commentId: string) => void;
  isNested?: boolean;
  showRepliesButton?: boolean;
  activeCommentId?: string | null; // Changed type to allow null
}

const CommentItemComponent: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onLike,
  onDelete,
  isNested = false,
  showRepliesButton = true,
  onViewReplies,
  activeCommentId,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { postReplies } = usePostStore();

  // FIX: Check if THIS comment's ID is the currently active one
  const isActive = activeCommentId === comment.id;

  const handleReplyPress = useCallback(() => {
    if (comment.id) onReply(comment.id);
  }, [comment.id, onReply]);

  const handleViewRepliesPress = useCallback(() => {
    if (comment?.id) onViewReplies?.(comment?.id);
  }, [comment, onViewReplies]);

  const relativeTime = getRelativeTime(comment?.createdAt ?? "");
  const hasReplies = comment.repliesCount && comment.repliesCount > 0;

  return (
    <View style={[styles.container, isNested && styles.nestedContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: comment.user?.avatarUrl ?? "https://i.pravatar.cc/150?img=1" }}
            style={styles.avatar}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            {comment.user?.firstName}
          </Text>
        </View>
        <Text style={[styles.timeText, { color: theme.colors.text.secondary }]}>
          {relativeTime}
        </Text>
      </View>

      {/* Comment Content */}
      <View style={styles.contentContainer}>
        <Text style={[styles.commentText, { color: theme.colors.text.primary }]}>
          {comment.content}
        </Text>
      </View>

      {/* Reply Button or View Replies Button */}
      {!isNested && (
        <View style={styles.replyContainer}>
          <View style={styles.avatarPlaceholder} />

          <Pressable onPress={handleReplyPress}>
            <Text style={[styles.replyText, { color: theme.colors.text.secondary }]}>
              {t(LocalizedStrings.community.post.reply)}
            </Text>
          </Pressable>

          {/* View / Hide Replies Toggle */}
          {hasReplies && showRepliesButton && (
            <Pressable onPress={handleViewRepliesPress}>
              <Text style={[styles.repliesText, { color: theme.colors.text.secondary }]}>
                {isActive
                  ? `${t(LocalizedStrings.common.hide)} ${t(LocalizedStrings.community.post.replies)}`
                  : `${t(LocalizedStrings.common.view)} ${comment.repliesCount} ${comment.repliesCount === 1 ? t(LocalizedStrings.community.post.reply) : t(LocalizedStrings.community.post.replies)}`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Render Replies only if THIS comment is active */}
      {isActive && postReplies && postReplies.length > 0 && (
        <View>
          {postReplies.map((reply) => (
            <CommentItemComponent
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
              isNested={true}
              showRepliesButton={false} // Prevent infinite nesting buttons
              activeCommentId={null} // Don't pass active ID down to nested replies
            />
          ))}
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: verticalScale(4),
  },
  replies: {
    marginLeft: scale(64),
  },
  nestedContainer: {
    paddingLeft: scale(33), // Avatar width + gap
    marginTop: verticalScale(8),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: scale(6),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  commentIcon: {
    aspectRatio: 1,
    height: verticalScale(24),
  },
  headerTitle: {
    fontFamily: "Manrope-Bold",
    fontSize: moderateScale(14),
    fontWeight: "700",
    lineHeight: verticalScale(19.6),
  },
  timeText: {
    fontFamily: "Manrope-Bold",
    fontSize: moderateScale(14),
    fontWeight: "700",
    lineHeight: verticalScale(19.6),
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(9),
    marginLeft: scale(30),
    paddingRight: scale(24),
    width: "100%",
  },
  avatar: {
    aspectRatio: 1,
    height: verticalScale(24),
    borderRadius: 999,
  },
  commentText: {
    flex: 1,
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(13),
    fontWeight: "500",
    lineHeight: verticalScale(18.2),
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(9),
    width: "100%",
  },
  avatarPlaceholder: {
    aspectRatio: 1,
    height: verticalScale(24),
  },
  replyText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: moderateScale(12),
    fontWeight: "600",
    lineHeight: verticalScale(16.8),
  },
  repliesText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: moderateScale(12),
    fontWeight: "600",
    lineHeight: verticalScale(16.8),
  },
});

export const CommentItem = memo(CommentItemComponent);
