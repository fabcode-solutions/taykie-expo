import React, { useState, useCallback, memo, RefObject } from "react";
import { View, TextInput, Pressable, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme";

import IconSend from "../icons/IconSend";
import { useAuthStore } from "@/stores/authStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useTranslation } from "react-i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface CommentInputProps {
  inputRef?: RefObject<TextInput | null>;
  /** Unused here (the parent performs the request); kept so existing callers still compile. */
  postId?: string;
  parentCommentId?: string;
  placeholder?: string;
  onCommentCreated?: (content: string) => void;
  autoFocus?: boolean;
}

const CommentInputComponent: React.FC<CommentInputProps> = ({
  parentCommentId,
  placeholder,
  onCommentCreated,
  inputRef,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl);
  const isReply = !!parentCommentId;

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setContent("");
    onCommentCreated?.(trimmed);
  }, [content, onCommentCreated]);

  const canSubmit = content.trim().length > 0;

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
        src={avatarUrl ?? "https://i.pravatar.cc/150?img=1"}
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
          placeholder={placeholder ?? t(LocalizedStrings.community.post.write_comment)}
          placeholderTextColor={theme.colors.taupe}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={500}
          autoFocus={autoFocus}
          returnKeyType="default"
          blurOnSubmit={false}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel={isReply ? t(LocalizedStrings.accessibility.postReply) : t(LocalizedStrings.accessibility.postComment)}
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
