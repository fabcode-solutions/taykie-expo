import React, { useMemo, memo, useState, useCallback, useEffect } from "react";
import { View, Image, StyleSheet, TouchableOpacity, Animated, FlatList } from "react-native";
import { ThemeText } from "@/components/primitives";
import { useTheme, fontFamily, type Theme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import IconCircleTickOutline from "../icons/IconCircleTickOutline";
import { useBottomDrawer } from "@/hooks/queries/useBottomDrawer";
import { CommentsBottomDrawer } from "../comment/CommentsBottomDrawer";
import IconBookmarked from "../icons/IconBookmarked";
import IconComment from "../icons/IconComment";
import IconHeart from "../icons/IconHeart";
import { CommunityPost, PollOption, PostType } from "@/types/posts.types";
import { getTimeAgo } from "@/utils/formatter";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import GroupCard from "../groups/GroupCard";
import BlurModal from "../ui/Modal";
import { router } from "expo-router";
import { Button } from "../ui/button";
import { useAuthStore } from "@/stores/authStore";
export interface PostCardProps {
  post: CommunityPost;
  onApiLike?: (postId: string, isLiked: boolean) => void;
  onApiComment?: (postId: string) => void;
  onApiShare?: (postId: string, isBookmarked: boolean) => void;
  onApiPollSubmit?: (postId: string, optionId: string) => void;
  onMenuPress?: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

export const PostCard = memo<PostCardProps>(
  ({
    post: initialPost,
    onApiLike,
    onApiComment,
    onApiShare,
    onApiPollSubmit,
    onMenuPress,
    onAuthorPress,
  }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [menuVisible, setMenuVisible] = React.useState(false);

    const user = useAuthStore((s) => s.user);
    const commentsDrawer = useBottomDrawer();
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const post = initialPost;

    const getInitials = (name: string) => {
      if (!name) return "?"; // Fallback if name is also missing
      const names = name.trim().split(" ");
      if (names.length === 1) return names[0].charAt(0).toUpperCase();
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    const MenuList = useMemo(
      () => [
        {
          key: "report",
          label: "Report User",
          navigateTo: "/report/report",
          disabled: user?.id === post.userId,
        },
      ],
      [user?.id, post.userId],
    );

    const votedOption = useMemo(() => {
      if (!post?.polls || !user?.id) return null;
      return post?.polls?.find(
        (poll) =>
          poll?.votes &&
          Array.isArray(poll.votes) &&
          poll.votes.some((vote: any) => vote?.userId === user.id),
      );
    }, [post?.polls, user?.id]);

    const hasUserVoted = !!votedOption;

    useEffect(() => {
      if (!initialPost?.polls || !user?.id) return;

      if (votedOption) {
        setSelectedOptionId(votedOption.id);
      } else {
        setSelectedOptionId(null);
      }
    }, [initialPost, user?.id, votedOption]); // Added votedOption to dependencies

    const handleLike = useCallback(() => {
      onApiLike?.(post?.id, post?.isLiked ?? false);
    }, [post?.id, post?.isLiked, onApiLike]);

    const handleComment = useCallback(() => {
      onApiComment?.(post?.id);
      commentsDrawer.open();
    }, [post?.id, onApiComment, commentsDrawer]);

    const handleShare = useCallback(() => {
      onApiShare?.(post?.id, post?.isBookmarked ?? false);
    }, [post?.id, post?.isBookmarked, onApiShare]);

    const handleMenuPress = useCallback(() => {
      setMenuVisible(true);
      onMenuPress?.(post?.id);
    }, [post?.id, onMenuPress]);

    const handleAuthorPress = useCallback(() => {
      onAuthorPress?.(post?.userId);
    }, [post?.userId, onAuthorPress]);

    const handlePollOptionSelect = useCallback((optionId: string) => {
      setSelectedOptionId(optionId);
    }, []);

    const handlePollSubmit = useCallback(() => {
      if (selectedOptionId && post?.id) {
        onApiPollSubmit?.(post.id, selectedOptionId);
      }
    }, [post?.id, onApiPollSubmit, selectedOptionId]);

    const handlePollCancel = useCallback(() => {
      setSelectedOptionId(null);
    }, []);

    const renderHeader = () => (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorSection}
          onPress={handleAuthorPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${t(LocalizedStrings.common.view)} ${post?.user?.firstName || "user"}'s profile`}
        >
          {/* Avatar circle */}
          <View style={styles.avatarContainer}>
            {post?.user?.avatarUrl ? (
              <Image
                source={{ uri: post.user.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <ThemeText style={styles.avatarInitial}>
                {getInitials(`${post?.user?.firstName ?? ""} ${post?.user?.lastName ?? ""}`)}
              </ThemeText>
            )}
          </View>

          <View style={styles.authorInfo}>
            <ThemeText style={styles.authorName}>{post?.user?.firstName || "No Name"}</ThemeText>
            <ThemeText style={styles.timestamp}>{getTimeAgo(post?.createdAt ?? "")}</ThemeText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleMenuPress}
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={moderateScale(20)}
            color={theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
    );

    const renderContent = () => (
      <View style={styles.contentSection}>
        {post?.text && <ThemeText style={styles.title}>{post?.text}</ThemeText>}
        {post?.type && <ThemeText style={styles.description}>{post?.type}</ThemeText>}
      </View>
    );

    const renderPollOptions = () => {
      if (!post?.polls) return null;

      const isPollActive = post?.type === PostType.POLL;
      const isPollResults = hasUserVoted;

      return (
        <View style={styles.pollOptionsContainer}>
          {post?.polls?.map((option) => (
            <PollOptionCom
              key={option.id}
              option={option}
              isActive={isPollActive}
              isSelected={selectedOptionId === option.id}
              showResults={isPollResults}
              onSelect={() => handlePollOptionSelect(option.id)}
            />
          ))}
          {!hasUserVoted && (
            <View style={styles.pollActions}>
              <TouchableOpacity
                style={styles.pollButtonOutline}
                onPress={handlePollCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel poll"
              >
                <ThemeText style={styles.pollButtonOutlineText}>
                  {t(LocalizedStrings.common.cancel)}
                </ThemeText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pollButtonFilled}
                onPress={handlePollSubmit}
                accessibilityRole="button"
                accessibilityLabel="Submit poll response"
                disabled={!selectedOptionId}
              >
                <ThemeText style={styles.pollButtonFilledText}>
                  {t(LocalizedStrings.common.submit)}
                </ThemeText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    };

    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          {renderHeader()}
          {/* Image for image posts */}
          {post?.type === PostType.IMAGE && post?.image && (
            <Image
              source={{ uri: post?.image }}
              style={styles.postImage}
              resizeMode="cover"
              accessibilityLabel="Post image"
            />
          )}
          {renderContent()}
          {/* Poll section */}
          {(post?.type === PostType.POLL ||
            post?.type === PostType.ACTIVE ||
            post?.type === PostType.RESULTS) &&
            renderPollOptions()}
          {(post.hashtags?.length ?? 0) > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {post.hashtags?.map((tag, index) => (
                <ThemeText
                  key={index}
                  style={{
                    backgroundColor: theme.colors.background.default,
                    fontSize: moderateScale(12),
                    borderRadius: 999,
                    paddingHorizontal: scale(10),
                    paddingVertical: verticalScale(4),
                    marginRight: scale(6),
                    marginBottom: verticalScale(6),
                  }}
                >
                  {tag}
                </ThemeText>
              ))}
            </View>
          )}
          {post.group && <GroupCard item={post.group} />}
          {/* Engagement section */}
          <UserEngagement
            likes={post?.likesCount}
            comments={post?.commentsCount}
            shares={5}
            isLiked={post?.isLiked}
            onLike={handleLike}
            onComment={handleComment}
            isBookmarked={post?.isBookmarked}
            onShare={handleShare}
          />
        </View>
        <BlurModal
          heading={""}
          visible={menuVisible}
          onRequestClose={() => {
            setMenuVisible(false);
          }}
        >
          <FlatList
            data={MenuList}
            keyExtractor={({ key }) => key}
            renderItem={({ item }) => (
              <Button
                title={item.label}
                onPress={() => {
                  setMenuVisible(false);
                  setTimeout(() => {
                    router.push({
                      pathname: item.navigateTo,
                      params: {
                        reportType: item.key,
                        postId: post.id,
                        userId: post.userId,
                      },
                    });
                  }, 300);
                }}
                disabled={item.disabled}
                variant="text"
                fullWidth={false}
                size="small"
                style={{ justifyContent: "flex-start", backgroundColor: "transparent" }}
                textStyle={{
                  color: item.disabled ? theme.colors.text.disabled : theme.colors.text.primary,
                }}
              />
            )}
          />
        </BlurModal>
        <CommentsBottomDrawer
          isVisible={commentsDrawer.isVisible}
          onClose={commentsDrawer.close}
          postId={post?.id}
        />
      </View>
    );
  },
);

PostCard.displayName = "PostCard";

const Tag = memo<{ text: string }>(({ text }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.tag}>
      <ThemeText style={styles.tagText}>{text}</ThemeText>
    </View>
  );
});

Tag.displayName = "Tag";

interface PollOptionProps {
  option: PollOption;
  isActive?: boolean;
  showResults?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const PollOptionCom = memo<PollOptionProps>(
  ({ option, isActive, showResults, isSelected, onSelect }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const progressAnim = useMemo(() => new Animated.Value(0), []);
    const showCheckmark = isSelected;

    useEffect(() => {
      if (showResults && option?.value !== undefined) {
        Animated.timing(progressAnim, {
          toValue: option.value,
          duration: 800,
          useNativeDriver: false,
        }).start();
      } else {
        progressAnim.setValue(0);
      }
    }, [showResults, option?.value, progressAnim]);

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });

    return (
      <TouchableOpacity
        style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
        onPress={onSelect}
        disabled={showResults}
        activeOpacity={0.7}
        accessibilityRole={isActive ? "radio" : "text"}
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${option?.label}${showResults ? `, ${option?.value}%` : ""}`}
      >
        {showResults && option?.value !== undefined && (
          <Animated.View style={[styles.pollProgressBar, { width: progressWidth }]} />
        )}

        <View style={styles.pollOptionContent}>
          {showCheckmark && (
            <View style={styles.checkmarkContainer}>
              <IconCircleTickOutline />
            </View>
          )}
          <ThemeText style={styles.pollOptionText}>{option?.label}</ThemeText>
        </View>

        {showResults && option?.value !== undefined && (
          <ThemeText style={[styles.pollPercentage, isSelected && styles.pollPercentageSelected]}>
            {option?.value}%
          </ThemeText>
        )}
      </TouchableOpacity>
    );
  },
);

PollOptionCom.displayName = "PollOption";

// Fixed: Allowed props to accept null/undefined safely
interface UserEngagementProps {
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

const UserEngagement = memo<UserEngagementProps>(
  ({
    likes,
    comments,
    shares,
    isBookmarked = false,
    isLiked = false,
    onLike,
    onComment,
    onShare,
  }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Fixed: Added early return if count is null/undefined to prevent .toString() crash
    const formatCount = (count?: number | null): string => {
      if (count == null) return "0";
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    };

    return (
      <View style={styles.engagement}>
        <TouchableOpacity
          style={styles.engagementItem}
          onPress={onLike}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          accessibilityRole="button"
          accessibilityLabel={`${likes || 0} likes`}
        >
          <IconHeart filled={isLiked} />
          <ThemeText style={[styles.engagementText, isLiked && { color: theme.colors.error.main }]}>
            {formatCount(likes)}
          </ThemeText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementItem}
          onPress={onComment}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          accessibilityRole="button"
          accessibilityLabel={`${comments || 0} comments`}
        >
          <IconComment />
          <ThemeText style={styles.engagementText}>{formatCount(comments)}</ThemeText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementItem}
          onPress={onShare}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          accessibilityRole="button"
          accessibilityLabel={`${shares || 0} shares`}
        >
          <IconBookmarked filled={isBookmarked} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  },
);

UserEngagement.displayName = "UserEngagement";

// Styles
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    cardContainer: {
      paddingHorizontal: scale(4),
      paddingVertical: verticalScale(8),
      marginBottom: verticalScale(2),
      ...theme.shadows[2],
    },
    card: {
      backgroundColor: theme.colors.background.paper,
      borderRadius: moderateScale(10),
      padding: verticalScale(10),
      paddingBottom: verticalScale(4),
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.01,
      shadowRadius: moderateScale(12),
      elevation: 3,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: verticalScale(10),
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(16),
      color: theme.colors.text.primary,
      marginBottom: verticalScale(3),
      lineHeight: verticalScale(20),
    },
    timestamp: {
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      fontSize: moderateScale(12),
      color: theme.colors.text.secondary,
      lineHeight: verticalScale(16),
    },
    menuButton: {
      aspectRatio: 1,
      height: verticalScale(20),
      justifyContent: "center",
      alignItems: "center",
    },
    postImage: {
      width: "100%",
      aspectRatio: 1,
      marginBottom: verticalScale(10),
    },
    contentSection: {
      marginBottom: verticalScale(12),
    },
    title: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(13),
      color: theme.colors.slateCharcoal,
      marginBottom: verticalScale(3),
      lineHeight: verticalScale(20),
    },
    description: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
      color: theme.colors.slateCharcoal,
      lineHeight: verticalScale(18),
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(3),
      marginTop: verticalScale(10),
    },
    tag: {
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(4),
      borderRadius: 999,
      height: verticalScale(24),
      justifyContent: "center",
      alignItems: "center",
    },
    tagText: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
      lineHeight: verticalScale(16),
      color: theme.colors.text.secondary,
    },
    pollOptionsContainer: {
      marginTop: 0,
      marginBottom: 0,
      gap: 3,
    },
    pollOption: {
      backgroundColor: theme.colors.background.default,
      borderRadius: moderateScale(6),
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(12),
      minHeight: verticalScale(40),
      overflow: "hidden",
      position: "relative",
      justifyContent: "center",
    },
    pollOptionSelected: {
      backgroundColor: "#D5CCBD",
    },
    pollProgressBar: {
      position: "absolute",
      left: 0,
      top: 0,
      height: verticalScale(40),
      backgroundColor: "rgba(213, 204, 189, 0.5)",
      zIndex: 0,
    },
    pollOptionContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(4),
      zIndex: 1,
      flex: 1,
    },
    checkmarkContainer: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    pollOptionText: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
      fontWeight: "400" as const,
      color: theme.colors.black,
      flex: 1,
      lineHeight: verticalScale(16),
    },
    pollPercentage: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
      color: theme.colors.taupe,
      position: "absolute",
      right: scale(10),
      zIndex: 1,
    },
    pollPercentageSelected: {
      color: theme.colors.slateCharcoal,
      fontFamily: fontFamily.manrope.medium,
    },
    pollActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: scale(10),
      marginTop: verticalScale(8),
    },
    pollButtonOutline: {
      flex: 1,
      height: verticalScale(40),
      borderRadius: 999,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    pollButtonOutlineText: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(12),
      color: theme.colors.slateCharcoal,
    },
    pollButtonFilled: {
      flex: 1,
      height: verticalScale(40),
      borderRadius: 999,
      backgroundColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    pollButtonFilledText: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      fontSize: moderateScale(12),
      color: theme.colors.white,
    },
    engagement: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(15),
      marginTop: 0,
    },
    engagementItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(3),
    },
    engagementText: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
      color: theme.colors.text.secondary,
    },

    authorSection: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: scale(10),
    },
    avatarContainer: {
      aspectRatio: 1,
      height: verticalScale(50),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    avatar: {
      aspectRatio: 1,
      height: "100%",
      borderRadius: 999,
    },
    avatarInitial: {
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
  });

export default PostCard;
