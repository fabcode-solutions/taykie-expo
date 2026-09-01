import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, SafeAreaView, Pressable, Text, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CommentList } from "./CommentList";
import { CommentInput } from "./CommentInput";
import { useToggleCommentLike } from "@/hooks/queries/useComments";
import { useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [replyToCommentId, setReplyToCommentId] = useState<string | undefined>();
  const inputRef = useRef<TextInput>(null);
  const toggleLikeMutation = useToggleCommentLike(postId);

  const handleReply = useCallback((commentId: string) => {
    setReplyToCommentId(commentId);
    inputRef.current?.focus();
  }, []);

  const handleLike = useCallback(
    (commentId: string) => {
      toggleLikeMutation.mutate(commentId);
    },
    [toggleLikeMutation],
  );

  const handleCommentCreated = useCallback(() => {
    setReplyToCommentId(undefined);
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  if (!postId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error.main }]}>
            Post ID is required
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
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close comments"
        >
          <Text style={[styles.closeButtonText, { color: theme.colors.primary.main }]}>Close</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Comments</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Comments List */}
      <View style={styles.listContainer}>
        <CommentList postId={postId} onReply={handleReply} onLike={handleLike} />
      </View>

      {/* Comment Input */}
      <CommentInput
        postId={postId}
        inputRef={inputRef}
        parentCommentId={replyToCommentId}
        placeholder={replyToCommentId ? "Write a reply..." : "Write a comment..."}
        onCommentCreated={handleCommentCreated}
        autoFocus={!!replyToCommentId}
      />
    </SafeAreaView>
  );
}

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
  closeButton: {
    padding: verticalScale(4),
    minWidth: scale(60),
  },
  closeButtonText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  headerTitle: {
    fontFamily: "Manrope-Bold",
    fontSize: moderateScale(18),
    fontWeight: "700",
  },
  headerSpacer: {
    width: scale(60),
  },
  listContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: verticalScale(24),
    gap: verticalScale(16),
  },
  errorText: {
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(16),
    textAlign: "center",
  },
});
