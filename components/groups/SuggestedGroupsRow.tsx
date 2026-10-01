import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useGroupStore } from "@/stores/groupStore";
import { GroupResponse } from "@/types/groups.types";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { cycleWindow } from "@/utils/cycleWindow";

const MAX_SUGGESTIONS = 10;

interface SuggestedGroupsRowProps {
  /**
   * Which block this is when the row appears several times in a feed — each slot shows
   * the next `count` suggestions (wrapping), so repeated blocks don't repeat groups.
   */
  slot?: number;
  count?: number;
  /**
   * Fetch recommended groups on mount. Set false when the parent fetches once for
   * several rows (the Community feed), so each block doesn't refetch.
   */
  autoFetch?: boolean;
}

interface SuggestedGroupCardProps {
  item: GroupResponse;
  isJoining: boolean;
  styles: ReturnType<typeof createStyles>;
  onOpen: (id: string) => void;
  onJoin: (id: string) => void;
}

// Memoized so joining one group doesn't re-render every card.
const SuggestedGroupCard = memo(function SuggestedGroupCard({
  item,
  isJoining,
  styles,
  onOpen,
  onJoin,
}: SuggestedGroupCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const handleOpen = useCallback(() => onOpen(item.id), [onOpen, item.id]);
  const handleJoin = useCallback(() => onJoin(item.id), [onJoin, item.id]);
  const membersCount = item.membersCount ?? 0;

  return (
    <Pressable style={styles.card} onPress={handleOpen} accessibilityRole="button">
      <View style={styles.avatar}>
        {item.uploadGroupPhoto ? (
          <Image source={{ uri: item.uploadGroupPhoto }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>{item.groupName?.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {item.groupName}
      </Text>
      <Text style={styles.members}>
        {membersCount}{" "}
        {membersCount === 1
          ? t(LocalizedStrings.groups.member)
          : t(LocalizedStrings.groups.members)}
      </Text>
      <TouchableOpacity
        style={styles.joinButton}
        onPress={handleJoin}
        disabled={isJoining}
        accessibilityRole="button"
        accessibilityLabel={`${t(LocalizedStrings.groups.join)} ${item.groupName}`}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color={theme.colors.text.primary} />
        ) : (
          <Text style={styles.joinText}>{t(LocalizedStrings.groups.join)}</Text>
        )}
      </TouchableOpacity>
    </Pressable>
  );
});

/**
 * "Suggested groups" strip at the top of the Community feed — the same
 * recommended list My Groups shows, surfaced where people actually browse.
 * Shows nothing while the first load is in flight or when there's nothing
 * to suggest, so it never leaves an empty box above the feed.
 *
 * STRUCTURE IS DELIBERATELY STABLE. This used to `return null` until the groups
 * loaded and then mount a header plus a horizontal FlatList in one go — a node added
 * to the parent's Yoga tree at the moment the response lands, the pattern behind the
 * Fabric/Yoga "ABA ownership" abort (YGNodeGetOwner(childYogaNode) == &yogaNode_,
 * RN 0.79, facebook/react-native#52349). So the container, header and scroller are
 * always mounted; "nothing to show" collapses the container to height 0 and only the
 * scroller's *children* change. A plain horizontal ScrollView (≤ MAX_SUGGESTIONS
 * cards) replaces the FlatList, so cards are never mounted/unmounted by windowing.
 */
function SuggestedGroupsRow({
  slot = 0,
  count = MAX_SUGGESTIONS,
  autoFetch = true,
}: SuggestedGroupsRowProps) {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const recommendedGroups = useGroupStore((s) => s.recommendedGroups);
  const fetchRecommendedGroups = useGroupStore((s) => s.fetchRecommendedGroups);
  const joinGroup = useGroupStore((s) => s.joinGroup);
  // Local, not groupStore.isLoading — that flag is shared with every other
  // group action (join, members, friends, ...).
  const [hasLoaded, setHasLoaded] = useState(!autoFetch);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!autoFetch) return;
    fetchRecommendedGroups()
      .catch((error) => console.warn("Failed to load suggested groups:", error))
      .finally(() => setHasLoaded(true));
  }, [fetchRecommendedGroups, autoFetch]);

  const suggestions = useMemo(
    () =>
      cycleWindow(
        (recommendedGroups ?? []).filter((g) => !g.isMember),
        slot,
        count,
      ),
    [recommendedGroups, slot, count],
  );

  const handleOpen = useCallback((id: string) => router.push(`/groups/${id}`), []);
  const handleSeeAll = useCallback(() => router.push("/groups/my-groups"), []);

  const handleJoin = useCallback(
    async (id: string) => {
      setJoiningId(id);
      try {
        const message = await joinGroup(id);
        // Joined groups drop out of the recommended list.
        await fetchRecommendedGroups();
        alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      } catch (error) {
        alert.show(
          AlertPresets.error(
            t(LocalizedStrings.common.error),
            error instanceof Error ? error.message : String(error),
          ),
        );
      } finally {
        setJoiningId(null);
      }
    },
    [joinGroup, fetchRecommendedGroups, alert, t],
  );

  // Nothing to show yet / nothing to suggest: collapse instead of unmounting — see above.
  const isEmpty = !hasLoaded || suggestions.length === 0;

  return (
    <View
      style={[styles.container, isEmpty && styles.collapsed]}
      pointerEvents={isEmpty ? "none" : "auto"}
      accessibilityElementsHidden={isEmpty}
      importantForAccessibility={isEmpty ? "no-hide-descendants" : "auto"}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t(LocalizedStrings.groups.suggestedGroups)}</Text>
        <TouchableOpacity onPress={handleSeeAll} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.seeAll}>{t(LocalizedStrings.groups.seeAll)}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {suggestions.map((group) => (
          <SuggestedGroupCard
            key={String(group.id)}
            item={group}
            isJoining={joiningId === group.id}
            styles={styles}
            onOpen={handleOpen}
            onJoin={handleJoin}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(SuggestedGroupsRow);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingTop: verticalScale(4),
      paddingBottom: verticalScale(16),
    },
    collapsed: {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      marginBottom: verticalScale(10),
    },
    title: {
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    seeAll: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      color: theme.colors.primary.dark,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      gap: scale(10),
    },
    card: {
      width: scale(150),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(12),
      padding: scale(12),
      alignItems: "center",
    },
    avatar: {
      width: moderateScale(48),
      height: moderateScale(48),
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(8),
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitial: {
      fontSize: moderateScale(20),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    name: {
      minHeight: verticalScale(36),
      textAlign: "center",
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    members: {
      marginTop: verticalScale(2),
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      color: theme.colors.primary.dark,
    },
    joinButton: {
      marginTop: verticalScale(10),
      alignSelf: "stretch",
      minHeight: verticalScale(32),
      borderRadius: moderateScale(50),
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    joinText: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      color: theme.colors.text.primary,
    },
  });
