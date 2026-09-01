import React, { useState, useCallback, memo, RefObject } from "react";
import { View, TextInput, Pressable, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme";

import { useCreateComment, useReplyToComment } from "@/hooks/queries/useComments";
import IconSend from "../icons/IconSend";
import { useAuthStore } from "@/stores/authStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface CommentInputProps {
  inputRef: RefObject<TextInput | null>;
  postId: string;
  parentCommentId?: string;
  placeholder?: string;
  onCommentCreated?: (content: string) => void;
  autoFocus?: boolean;
}

const CommentInputComponent: React.FC<CommentInputProps> = ({
  postId,
  parentCommentId,
  placeholder = "Write a comment...",
  onCommentCreated,
  inputRef,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const user = useAuthStore((s) => s.user);
  const createCommentMutation = useCreateComment(postId);
  const replyCommentMutation = useReplyToComment(postId);

  const isLoading = createCommentMutation.isPending || replyCommentMutation.isPending;
  const isReply = !!parentCommentId;

  const handleSubmit = useCallback(() => {
    if (!content.trim() || isLoading) return;

    setContent("");
    onCommentCreated?.(content.trim());
  }, [
    content,
    isLoading,
    isReply,
    parentCommentId,
    createCommentMutation,
    replyCommentMutation,
    onCommentCreated,
  ]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const canSubmit = content.trim().length > 0 && !isLoading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.default,
          borderTopColor: "#D6E3EB",
        },
      ]}
    >
      <Image
        src={user?.avatarUrl ?? "https://i.pravatar.cc/150?img=1"}
        width={scale(40)}
        height={verticalScale(40)}
        style={styles.avatar}
      />
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.white,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text.primary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.taupe}
          value={content}
          onChangeText={setContent}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline
          maxLength={500}
          autoFocus={autoFocus}
          editable={!isLoading}
          returnKeyType="default"
          blurOnSubmit={false}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel={isReply ? "Post reply" : "Post comment"}
        accessibilityState={{ disabled: !canSubmit }}
      >
        <IconSend />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    width: "100%",
  },
  avatar: {
    borderRadius: 999,
    aspectRatio: 1,
    height: verticalScale(40),
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    gap: scale(10),
    borderTopWidth: scale(1),
  },
  inputContainer: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    minHeight: verticalScale(40),
    maxHeight: verticalScale(100),
  },
  input: {
    fontFamily: "Manrope-Medium",
    fontSize: moderateScale(14),
    lineHeight: verticalScale(20),
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  sendButton: {
    width: scale(56),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    fontFamily: "Manrope-Bold",
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export const CommentInput = memo(CommentInputComponent);
