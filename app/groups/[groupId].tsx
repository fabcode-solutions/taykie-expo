import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  Dimensions,
  TextInput,
  Platform,
  Keyboard,
  ScrollView,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ParallaxScrollView, SafeAreaScreen, ThemeStatusBar } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Images } from "@/assets";
import { GroupDetailsHero } from "@/components/groups/GroupDetailsHero";
import IconMembers from "@/components/icons/IconMembers";
import IconImage from "@/components/icons/IconImage";
import IconPoll from "@/components/icons/IconPoll";
import { useGroupStore } from "@/stores/groupStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { formatDistanceToNow } from "date-fns";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";
import { GroupMember } from "@/services/repositories/groups";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { Button } from "@/components/ui/button";
import { GroupDetailsSkeleton } from "@/components/groups/GroupSkeletons";
import { GroupResponse } from "@/types/groups.types";
import { CommunityPost, CreatePostRequest, PostType } from "@/types/posts.types";
import { usePostStore } from "@/stores/postStore";
import ProfilePostItem from "@/components/profile/ProfilePostItem";
import { PostCardSkeleton } from "@/components/social/PostCardSkeleton";
import { groupPostKeys, useGroupPosts } from "@/hooks/queries/groupPosts";
import { useQueryClient } from "@tanstack/react-query";

type ParallaxProps = React.ComponentProps<typeof ParallaxScrollView>;
type RenderHeader = NonNullable<ParallaxProps["renderHeader"]>;
type GroupStyles = ReturnType<typeof createStyles>;

const HEADER_MAX_HEIGHT = Dimensions.get("screen").height / 1.3;
const HEADER_MIN_HEIGHT = Dimensions.get("screen").height / 2.2;
// While the keyboard is open the hero collapses down to just its top row (back button),
// instead of the usual ~45% of the screen — otherwise header + keyboard together leave
// no visible room for the post box.
const HEADER_MIN_HEIGHT_KEYBOARD = verticalScale(120);
const POST_MAX_LENGTH = 250;
// Space kept between the composer's bottom edge (the Post button) and the keyboard.
const KEYBOARD_GAP = verticalScale(16);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getYear = (value?: string | null) => {
  if (!value) return "—";
  const year = new Date(value).getFullYear();
  return Number.isNaN(year) ? "—" : String(year);
};

// formatDistanceToNow throws a RangeError on an invalid date — guard it so a bad
// updatedAt from the API can't crash the screen.
const getLastActivity = (value?: string | null) => {
  if (!value) return t(LocalizedStrings.device.compartments.noActivity);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t(LocalizedStrings.device.compartments.noActivity);
  return formatDistanceToNow(date, { addSuffix: true });
};

const getJoinedBy = (group: GroupResponse | null) => {
  if (!group?.members || group.members.length === 0) return "";

  const members = group.members;
  // Fallback to array length if membersCount isn't provided
  const totalCount = group.membersCount ?? members.length;
  const getName = (member: GroupMember) => member.user?.firstName || "";

  if (totalCount <= 2) {
    return members.map(getName).filter(Boolean).join(", ");
  }

  const firstTwo = members.slice(0, 2).map(getName).filter(Boolean).join(", ");
  const remaining = totalCount - 2;
  const andText = t(LocalizedStrings.auth.signup.legal.and);
  const label =
    remaining === 1 ? t(LocalizedStrings.common.other) : t(LocalizedStrings.common.others);

  return `${firstTwo} ${andText} ${remaining} ${label}`;
};

// ─── Post composer ────────────────────────────────────────────────────────────

type ComposerRequest = Pick<CreatePostRequest, "type" | "text" | "image" | "pollOptions">;

interface PostComposerProps {
  styles: GroupStyles;
  placeholderColor: string;
  onFocus: () => void;
  /** Resolves true when the post was created (the box is then cleared). */
  onSubmit: (request: ComposerRequest) => Promise<boolean>;
  onLayout: (y: number, height: number) => void;
}

const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 4;
const EMPTY_POLL = ["", ""];

// Owns its own text state: typing used to re-render the WHOLE screen (parallax header,
// hero image, group details) on every keystroke.
const PostComposer = memo(function PostComposer({
  styles,
  placeholderColor,
  onFocus,
  onSubmit,
  onLayout,
}: PostComposerProps) {
  const [mode, setMode] = useState<PostType>(PostType.TEXT);
  const [textPost, setTextPost] = useState("");
  const [image, setImage] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(EMPTY_POLL);
  const [isPosting, setIsPosting] = useState(false);

  const filledPollOptions = useMemo(
    () => pollOptions.map((o) => o.trim()).filter(Boolean),
    [pollOptions],
  );
  const hasText = textPost.trim().length > 0;
  const isReady =
    mode === PostType.IMAGE
      ? !!image
      : mode === PostType.POLL
        ? hasText && filledPollOptions.length >= POLL_MIN_OPTIONS
        : hasText;
  const canPost = isReady && !isPosting;

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
      aspect: [1, 1],
    });
    if (!result.canceled) setImage(result.assets[0].uri);
    return !result.canceled;
  }, []);

  // Tapping an active mode's icon goes back to a plain text post.
  const handleImagePress = useCallback(async () => {
    if (mode === PostType.IMAGE) {
      setMode(PostType.TEXT);
      return;
    }
    setMode(PostType.IMAGE);
    if (!image) {
      const picked = await pickImage();
      if (!picked) setMode(PostType.TEXT);
    }
  }, [mode, image, pickImage]);

  const handlePollPress = useCallback(() => {
    setMode((prev) => (prev === PostType.POLL ? PostType.TEXT : PostType.POLL));
  }, []);

  const updatePollOption = useCallback((text: string, index: number) => {
    setPollOptions((prev) => prev.map((item, i) => (i === index ? text : item)));
  }, []);
  const addPollOption = useCallback(() => {
    setPollOptions((prev) => (prev.length < POLL_MAX_OPTIONS ? [...prev, ""] : prev));
  }, []);
  const removePollOption = useCallback((index: number) => {
    setPollOptions((prev) =>
      prev.length > POLL_MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev,
    );
  }, []);

  const handlePost = useCallback(async () => {
    if (!canPost) return;

    let request: ComposerRequest;
    if (mode === PostType.IMAGE) {
      request = { type: PostType.IMAGE, image, ...(hasText && { text: textPost.trim() }) };
    } else if (mode === PostType.POLL) {
      request = {
        type: PostType.POLL,
        text: textPost.trim(),
        pollOptions: filledPollOptions.map((label) => ({ label })),
      };
    } else {
      request = { type: PostType.TEXT, text: textPost.trim() };
    }

    setIsPosting(true);
    const ok = await onSubmit(request);
    setIsPosting(false);
    if (ok) {
      setMode(PostType.TEXT);
      setTextPost("");
      setImage("");
      setPollOptions(EMPTY_POLL);
      Keyboard.dismiss();
    }
  }, [canPost, mode, image, hasText, textPost, filledPollOptions, onSubmit]);

  const textPlaceholder =
    mode === PostType.POLL
      ? t(LocalizedStrings.community.placeHolder.askQuestion)
      : mode === PostType.IMAGE
        ? t(LocalizedStrings.community.placeHolder.addCaption)
        : t(LocalizedStrings.groups.writeSomething);

  return (
    <View
      style={styles.composer}
      onLayout={(e) => onLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
    >
      <View style={styles.textInputWrapper}>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          onChangeText={setTextPost}
          onFocus={onFocus}
          value={textPost}
          maxLength={POST_MAX_LENGTH}
          placeholderTextColor={placeholderColor}
          placeholder={textPlaceholder}
        />
        <Text style={styles.letterCount}>
          {textPost.length}/{POST_MAX_LENGTH}
        </Text>
        <View style={styles.postIcons}>
          <TouchableOpacity
            onPress={handleImagePress}
            style={mode !== PostType.IMAGE && styles.iconInactive}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === PostType.IMAGE }}
            accessibilityLabel={t(LocalizedStrings.community.post.imagePost)}
          >
            <IconImage />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePollPress}
            style={mode !== PostType.POLL && styles.iconInactive}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === PostType.POLL }}
            accessibilityLabel={t(LocalizedStrings.community.post.pollPost)}
          >
            <IconPoll />
          </TouchableOpacity>
        </View>
      </View>

      {mode === PostType.IMAGE && !!image && (
        <View style={styles.imagePreviewWrapper}>
          <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.imageActionBtn} onPress={pickImage}>
              <Text style={styles.imageActionText}>
                {t(LocalizedStrings.community.placeHolder.selectImage)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageActionBtn}
              onPress={() => {
                setImage("");
                setMode(PostType.TEXT);
              }}
              accessibilityLabel={t(LocalizedStrings.common.delete)}
            >
              <Text style={styles.imageActionText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {mode === PostType.POLL && (
        <View style={styles.pollOptions}>
          {pollOptions.map((option, index) => (
            <View style={styles.pollOptionRow} key={`poll-option-${index}`}>
              <TextInput
                style={styles.pollOptionInput}
                value={option}
                maxLength={50}
                onChangeText={(text) => updatePollOption(text, index)}
                onFocus={onFocus}
                placeholderTextColor={placeholderColor}
                placeholder={`${t(LocalizedStrings.community.post.option)} ${index + 1}`}
              />
              {pollOptions.length > POLL_MIN_OPTIONS && (
                <TouchableOpacity
                  onPress={() => removePollOption(index)}
                  hitSlop={8}
                  accessibilityLabel={t(LocalizedStrings.common.delete)}
                >
                  <Text style={styles.imageActionText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {pollOptions.length < POLL_MAX_OPTIONS && (
            <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
              <Text style={styles.addOptionText}>
                {t(LocalizedStrings.community.post.add_option)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.postButtonRow}>
        <Button
          fullWidth={false}
          size="small"
          title={t(LocalizedStrings.community.post.title)}
          onPress={handlePost}
          loading={isPosting}
          disabled={!canPost}
          textStyle={styles.joinButtonText}
          rightIcon={null}
        />
      </View>
    </View>
  );
});

// ─── Group posts ──────────────────────────────────────────────────────────────

interface GroupPostsProps {
  groupId: string;
  styles: GroupStyles;
}

// Posts made in this group, below the composer. Plain map (not a FlatList): it lives
// inside the parallax ScrollView, and a nested VirtualizedList would warn/misbehave.
const GroupPosts = memo(function GroupPosts({ groupId, styles }: GroupPostsProps) {
  const alert = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: posts = [], isLoading } = useGroupPosts(groupId);
  const likePost = usePostStore((s) => s.likePost);
  const unLikePost = usePostStore((s) => s.unLikePost);
  const bookmarkPost = usePostStore((s) => s.bookmarkPost);
  const unBookmarkPost = usePostStore((s) => s.unBookmarkPost);
  const fetchPostComments = usePostStore((s) => s.fetchPostComments);
  const voteOnPollPost = usePostStore((s) => s.voteOnPollPost);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: groupPostKeys.list(groupId) }),
    [queryClient, groupId],
  );
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        await refresh();
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [refresh, alert],
  );

  const handleLike = useCallback(
    (postId: string, isLiked: boolean) =>
      run(() => (isLiked ? unLikePost(postId) : likePost(postId))),
    [run, likePost, unLikePost],
  );
  const handleShare = useCallback(
    (postId: string, isBookmarked: boolean) =>
      run(() => (isBookmarked ? unBookmarkPost(postId) : bookmarkPost(postId))),
    [run, bookmarkPost, unBookmarkPost],
  );
  const handleComment = useCallback(
    (postId: string) => {
      fetchPostComments(postId).catch((error) =>
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error))),
      );
    },
    [fetchPostComments, alert],
  );
  const handlePoll = useCallback(
    (postId: string, optionId: string) => run(() => voteOnPollPost(postId, optionId)),
    [run, voteOnPollPost],
  );
  const handleAuthorPress = useCallback(
    (authorId: string) =>
      router.push({ pathname: "/profile/public-profile", params: { userId: authorId } }),
    [router],
  );

  return (
    <View style={styles.postsSection}>
      <Text style={styles.postsHeading}>{t(LocalizedStrings.groups.groupPosts)}</Text>
      {isLoading ? (
        <View>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      ) : posts.length === 0 ? (
        <Text style={styles.postsEmpty}>{t(LocalizedStrings.groups.noGroupPosts)}</Text>
      ) : (
        <View>
          {posts.map((post: CommunityPost) => (
            <ProfilePostItem
              key={post.id}
              post={post}
              onLike={handleLike}
              onShare={handleShare}
              onComment={handleComment}
              onPollSubmit={handlePoll}
              onDeleted={refresh}
              onAuthorPress={handleAuthorPress}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Group details ────────────────────────────────────────────────────────────

interface GroupDetailsProps {
  group: GroupResponse | null;
  styles: GroupStyles;
  onJoinLeave: () => void;
  onMembersPress: () => void;
  isJoinLeaveBusy: boolean;
}

const GroupDetails = memo(function GroupDetails({
  group,
  styles,
  onJoinLeave,
  onMembersPress,
  isJoinLeaveBusy,
}: GroupDetailsProps) {
  const joinedBy = useMemo(() => getJoinedBy(group), [group]);

  return (
    <>
      <View style={styles.groupWrapper}>
        <Text style={styles.groupTitle}>{group?.groupName}</Text>
        {/* Only members can open the member list. */}
        <TouchableOpacity
          style={styles.groupMembers}
          onPress={onMembersPress}
          disabled={!group?.isMember}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t(LocalizedStrings.groups.groupMembers)}
        >
          <IconMembers />
          <Text style={styles.memberCount}>{group?.membersCount}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.groupDescription}>{group?.groupDescription}</Text>
      <View style={styles.groupJoin}>
        <Text style={styles.memberCount}>{t(LocalizedStrings.groups.joinedBy)}</Text>
        <Text style={[styles.memberCount, styles.strong]}>{joinedBy}</Text>
      </View>
      <View style={styles.infoWrapper}>
        <View style={styles.info}>
          <Text style={styles.memberCount}>
            {t(LocalizedStrings.common.since)}: {getYear(group?.createdAt)}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.memberCount}>
            {t(LocalizedStrings.groups.lastActivity)}: {getLastActivity(group?.updatedAt)}
          </Text>
        </View>
        <Button
          fullWidth={false}
          size="small"
          textStyle={styles.joinButtonText}
          title={
            group?.isMember
              ? t(LocalizedStrings.groups.leaveGroup)
              : t(LocalizedStrings.groups.joinGroup)
          }
          onPress={onJoinLeave}
          loading={isJoinLeaveBusy}
          disabled={group?.userRole === "SuperAdmin" || isJoinLeaveBusy}
        />
      </View>
    </>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SingleGroupScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const fetchGroupById = useGroupStore((s) => s.fetchGroupById);
  const group = useGroupStore((s) => s.group);
  const joinGroup = useGroupStore((s) => s.joinGroup);
  const leaveGroup = useGroupStore((s) => s.leaveGroup);
  const fetchRecommendedGroups = useGroupStore((s) => s.fetchRecommendedGroups);
  const isLoading = useGroupStore((s) => s.isLoading);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const scrollRef = useRef<ScrollView>(null);
  const composerFocusedRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Keyboard's top edge in screen coordinates (the scroll view starts at screen top).
  const keyboardTopRef = useRef(0);
  const scrollYRef = useRef(0);
  // Composer frame inside the scroll CONTENT (its onLayout y is relative to
  // parallaxInner, which sits at the content's paddingTop = HEADER_MAX_HEIGHT).
  const composerFrameRef = useRef<{ y: number; height: number } | null>(null);

  // Scroll just enough that the composer's bottom (incl. the Post button) sits above
  // the keyboard. Measured, not scrollToEnd: there are posts below the composer now,
  // and scrollToEnd right after adding padding raced the layout — it scrolled to the
  // OLD end, leaving the box behind the keyboard.
  const scrollComposerIntoView = useCallback(() => {
    const frame = composerFrameRef.current;
    if (!composerFocusedRef.current || !frame || keyboardTopRef.current <= 0) return;
    const composerBottom = HEADER_MAX_HEIGHT + frame.y + frame.height;
    const target = composerBottom + KEYBOARD_GAP - keyboardTopRef.current;
    if (target > scrollYRef.current) {
      scrollRef.current?.scrollTo({ y: target, animated: true });
    }
  }, []);

  const handleComposerLayout = useCallback((y: number, height: number) => {
    composerFrameRef.current = { y, height };
  }, []);

  // ── Keyboard handling ──
  // Edge-to-edge is on (app.config.ts), so on Android the window no longer resizes for
  // the keyboard and KeyboardAvoidingView("height") doesn't reliably help — and the
  // parallax hero is an absolute overlay on top of the scroll content anyway. So the
  // keyboard is handled directly: collapse the hero, add the keyboard's height as
  // bottom padding (scroll room), then scroll the composer into view above it.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      setKeyboardHeight(0);
      composerFocusedRef.current = false;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Keyboard opened: bring the composer up. Also re-run from onContentSizeChange
  // (below), so a late layout of the keyboard padding can't leave it hidden.
  useEffect(() => {
    if (keyboardHeight > 0) {
      const timer = setTimeout(scrollComposerIntoView, 100);
      return () => clearTimeout(timer);
    }
  }, [keyboardHeight, scrollComposerIntoView]);

  const handleComposerFocus = useCallback(() => {
    composerFocusedRef.current = true;
    // Keyboard already open (e.g. refocus) — the keyboardHeight effect won't re-fire.
    if (Keyboard.isVisible()) setTimeout(scrollComposerIntoView, 50);
  }, [scrollComposerIntoView]);

  // ── Data ──
  const fetchGroupDetails = useCallback(async () => {
    try {
      await fetchGroupById(groupId);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, [groupId, fetchGroupById, alert]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const [isJoinLeaveBusy, setIsJoinLeaveBusy] = useState(false);
  const handleJoinLeaveGroup = useCallback(async () => {
    setIsJoinLeaveBusy(true);
    try {
      let message = "";
      if (group?.isMember) {
        message = await leaveGroup(groupId);
      } else {
        message = await joinGroup(groupId);
      }
      await fetchRecommendedGroups();

      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    } finally {
      setIsJoinLeaveBusy(false);
    }
  }, [group?.isMember, groupId, joinGroup, leaveGroup, fetchRecommendedGroups, alert]);

  const handleMembersPress = useCallback(() => {
    router.push({ pathname: "/groups/members", params: { groupId } });
  }, [router, groupId]);

  const createPost = usePostStore((s) => s.createPost);
  const queryClient = useQueryClient();
  const handleCreatePost = useCallback(
    async (request: ComposerRequest) => {
      try {
        await createPost({ ...request, groupId });
        await queryClient.invalidateQueries({ queryKey: groupPostKeys.list(groupId) });
        alert.show(AlertPresets.success(t(LocalizedStrings.groups.postCreated)));
        return true;
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
        return false;
      }
    },
    [createPost, groupId, queryClient, alert],
  );

  // fetchGroupById clears `group` while loading, so no group + loading = first load.
  // (join/leave also toggle isLoading but keep the group, so they don't flash the skeleton.)
  const showSkeleton = isLoading && !group;

  // ── Parallax header ──
  const heroImage = useMemo(
    () => (group?.uploadGroupPhoto ? { uri: group.uploadGroupPhoto } : Images.authStart),
    [group?.uploadGroupPhoto],
  );

  const renderHeader = useCallback<RenderHeader>(
    ({ scrollY, headerScrollDistance, headerHeight }) => {
      const imageScale = scrollY.interpolate({
        inputRange: [-headerHeight, headerScrollDistance, headerScrollDistance],
        outputRange: [1.5, 1, 1],
        extrapolateLeft: "extend",
        extrapolateRight: "clamp",
      });

      const collapseTranslateY = scrollY.interpolate({
        inputRange: [0, headerScrollDistance],
        outputRange: [0, headerScrollDistance / 2],
        extrapolate: "clamp",
      });

      const centeringTranslateY = Animated.multiply(
        Animated.subtract(imageScale, 1),
        -headerHeight / 2,
      );

      const imageTranslateY = Animated.add(collapseTranslateY, centeringTranslateY);

      const overlayOpacity = scrollY.interpolate({
        inputRange: [0, 0],
        outputRange: [0, 0],
        extrapolate: "clamp",
      });

      const topRowTranslateY = scrollY.interpolate({
        inputRange: [0, headerScrollDistance],
        outputRange: [0, headerScrollDistance],
        extrapolate: "clamp",
      });

      return (
        <GroupDetailsHero
          imageUri={heroImage}
          heroSlidesLabel={"d"}
          onBack={router.back}
          imageScale={imageScale}
          imageTranslateY={imageTranslateY}
          overlayOpacity={overlayOpacity}
          topRowTranslateY={topRowTranslateY}
        />
      );
    },
    [heroImage, router.back],
  );

  const contentContainerStyle = useMemo(
    () => [
      styles.scrollContent,
      {
        paddingTop: HEADER_MAX_HEIGHT,
        // Keyboard height as extra scroll room so the composer can move above it.
        paddingBottom: verticalScale(40) + keyboardHeight,
        backgroundColor: theme.colors.background.default,
        borderRadius: 20,
      },
    ],
    [styles.scrollContent, keyboardHeight, theme.colors.background.default],
  );

  const scrollViewProps = useMemo(
    () => ({
      showsVerticalScrollIndicator: false,
      keyboardShouldPersistTaps: "handled" as const,
      keyboardDismissMode: "interactive" as const,
      // Listener only — ParallaxScrollView still drives the header from scrollY.
      onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      },
      onContentSizeChange: () => {
        if (keyboardTopRef.current > 0) scrollComposerIntoView();
      },
    }),
    [scrollComposerIntoView],
  );

  return (
    <SafeAreaScreen
      withBackground={false}
      edges={["left", "right", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.colors.background.default }]}
    >
      <ThemeStatusBar style="light" />
      <ParallaxScrollView
        scrollRef={scrollRef}
        headerHeight={HEADER_MAX_HEIGHT}
        headerMinHeight={keyboardHeight > 0 ? HEADER_MIN_HEIGHT_KEYBOARD : HEADER_MIN_HEIGHT}
        contentOverlapsHeader={false}
        contentContainerStyle={contentContainerStyle}
        scrollViewProps={scrollViewProps}
        renderHeader={renderHeader}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.parallaxInner}>
            {/* Stable wrapper — only its contents swap between skeleton and details. */}
            <View>
              {showSkeleton ? (
                <GroupDetailsSkeleton />
              ) : (
                <GroupDetails
                  group={group}
                  styles={styles}
                  onJoinLeave={handleJoinLeaveGroup}
                  onMembersPress={handleMembersPress}
                  isJoinLeaveBusy={isJoinLeaveBusy}
                />
              )}
            </View>
            {/* Posting is for members only. Stable wrapper: joining/leaving only swaps
                its contents instead of mounting/unmounting a sibling view. */}
            <View>
              {!showSkeleton && group?.isMember ? (
                <PostComposer
                  styles={styles}
                  placeholderColor={theme.colors.text.secondary}
                  onFocus={handleComposerFocus}
                  onSubmit={handleCreatePost}
                  onLayout={handleComposerLayout}
                />
              ) : null}
            </View>
            {/* Posts made in this group (stable wrapper, same rationale as above). */}
            <View>
              {!showSkeleton && !!groupId ? <GroupPosts groupId={groupId} styles={styles} /> : null}
            </View>
          </View>
        </View>
      </ParallaxScrollView>
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    contentWrapper: {},
    container: {},
    parallaxInner: {
      padding: verticalScale(16),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    composer: {
      marginVertical: verticalScale(15),
    },
    postButtonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: verticalScale(8),
    },
    iconInactive: {
      opacity: 0.55,
    },
    imagePreviewWrapper: {
      marginTop: verticalScale(10),
      borderRadius: moderateScale(10),
      overflow: "hidden",
    },
    imagePreview: {
      width: "100%",
      aspectRatio: 1,
    },
    imageActions: {
      position: "absolute",
      top: verticalScale(8),
      right: scale(8),
      flexDirection: "row",
      gap: scale(8),
    },
    imageActionBtn: {
      backgroundColor: theme.colors.white,
      borderRadius: 999,
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
    },
    imageActionText: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(12),
    },
    pollOptions: {
      marginTop: verticalScale(10),
      gap: verticalScale(8),
    },
    pollOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
    },
    pollOptionInput: {
      flex: 1,
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border,
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      minHeight: verticalScale(40),
      paddingHorizontal: scale(12),
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(14),
    },
    addOptionBtn: {
      borderWidth: scale(1),
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(12),
    },
    addOptionText: {
      color: theme.colors.text.secondary,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(14),
    },
    postsSection: {
      marginTop: verticalScale(10),
    },
    postsHeading: {
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
      marginBottom: verticalScale(8),
    },
    postsEmpty: {
      textAlign: "center",
      paddingVertical: verticalScale(24),
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.secondary,
    },
    joinButtonText: {
      fontSize: moderateScale(14),
    },
    scrollContent: {
      paddingBottom: verticalScale(40),
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
      justifyContent: "space-between",
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
    section: {
      marginTop: verticalScale(20),
      gap: verticalScale(4),
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
    inputLabel: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
      marginBottom: verticalScale(6),
    },
    rightIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(20),
    },
    searchContainer: {
      marginBottom: theme.spacing.md,
      borderRadius: moderateScale(60),
      borderColor: theme.colors.white,
      padding: 0,
      height: verticalScale(40),
    },
    serachWrapper: {
      marginTop: verticalScale(20),
      overflow: "hidden",
    },
    searchResultWrapper: {
      marginVertical: verticalScale(30),
    },
    searchResultEmpty: {
      textAlign: "center",
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      color: theme.colors.primary.dark,
    },
    recommendHeading: {
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    recGroupWrapper: {
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      padding: verticalScale(10),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: verticalScale(10),
      gap: verticalScale(10),
      paddingRight: scale(16),
    },
    recGroupLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    recGroupIcon: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: 999,
      backgroundColor: theme.colors.background.default,
      justifyContent: "center",
      alignItems: "center",
      marginRight: scale(10),
    },
    recGroupHeading: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(14),
      fontStyle: "normal",
      fontWeight: 700 as const,
    },
    recGroupMember: {
      color: theme.colors.primary.dark,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(14),
      fontStyle: "normal",
      fontWeight: 500 as const,
    },
    recGroupButton: {
      borderRadius: moderateScale(50),
      borderWidth: scale(1),
      borderColor: "#DADADA",
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(13),
      justifyContent: "center",
      alignItems: "center",
    },
    recGroupButtonActive: {
      borderRadius: moderateScale(50),
      borderWidth: scale(1),
      borderColor: theme.colors.primary.main,
      backgroundColor: theme.colors.primary.main,
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(13),
      justifyContent: "center",
      alignItems: "center",
    },
    recGroupBtnText: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(14),
      fontStyle: "normal",
      fontWeight: 500 as const,
      lineHeight: verticalScale(16),
    },
    button: {
      marginTop: verticalScale(10),
    },
    frameChild: {
      height: verticalScale(30),
      aspectRatio: 1,
    },
    btnTextStyle: {
      fontSize: moderateScale(20),
    },
    groupsWrapper: {
      marginTop: verticalScale(20),
      gap: verticalScale(10),
    },
    groupWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    groupTitle: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(20),
      fontStyle: "normal",
      fontWeight: 700 as const,
      lineHeight: verticalScale(28),
    },
    groupMembers: { flexDirection: "row", alignItems: "center", gap: scale(5) },
    memberCount: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(14),
      fontStyle: "normal",
      fontWeight: 500 as const,
      lineHeight: verticalScale(16),
    },
    groupDescription: {
      color: theme.colors.primary.dark,
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(14),
      fontStyle: "normal",
      fontWeight: 400 as const,
      lineHeight: verticalScale(18),
      marginTop: verticalScale(10),
    },
    strong: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: 700 as const,
    },
    groupJoin: {
      flexDirection: "row",
      gap: scale(3),
      marginTop: verticalScale(15),
    },
    info: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
    },
    dot: {
      aspectRatio: 1,
      height: verticalScale(4),
      backgroundColor: theme.colors.slateCharcoal,
      borderRadius: moderateScale(4),
    },
    infoWrapper: {
      justifyContent: "space-between",
      flexDirection: "row",
      alignItems: "center",
      marginTop: verticalScale(15),
    },
    textInputWrapper: {
      position: "relative",
    },
    letterCount: {
      position: "absolute",
      bottom: verticalScale(8),
      right: scale(12),
      color: theme.colors.primary.dark,
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(14),
      fontStyle: "normal",
      fontWeight: 400 as const,
      lineHeight: verticalScale(18),
    },
    postIcons: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: scale(5),
      position: "absolute",
      bottom: verticalScale(8),
      left: scale(12),
    },
    textInput: {
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.border,
      borderWidth: scale(1),
      borderStyle: "solid",
      borderRadius: moderateScale(10),
      minHeight: verticalScale(120),
      paddingHorizontal: scale(12),
      paddingTop: verticalScale(12),
      paddingBottom: verticalScale(35),
      color: theme.colors.text.primary,
      fontFamily: "Manrope-Regular",
      fontSize: moderateScale(14),
      textAlignVertical: "top",
    },
  });
