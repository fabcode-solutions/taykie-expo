import React, { memo, useCallback, useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily, Theme, useTheme } from "@/theme";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTips } from "@/hooks/queries/tips";
import { Tip } from "@/services/api/tips";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { cycleWindow } from "@/utils/cycleWindow";

const MAX_TIPS = 10;
const SKELETON_COUNT = 2;

/** Opens the "all tips" screen (app/tips/index.tsx). */
export const openAllTips = () => router.push("/tips" as Href);

/** Opens the tip detail screen (app/tips/[tipId].tsx). */
export const openTip = (tipId: string) =>
  router.push({ pathname: "/tips/[tipId]", params: { tipId } } as Href);

interface TipCardProps {
  tip: Tip;
  styles: ReturnType<typeof createStyles>;
  iconColor: string;
  onOpen: (tipId: string) => void;
}

// Memoized so the row doesn't re-render every card when one changes.
const TipCard = memo(function TipCard({ tip, styles, iconColor, onOpen }: TipCardProps) {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onOpen(tip.id), [onOpen, tip.id]);

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${t(LocalizedStrings.tips.tip)}: ${tip.title}`}
    >
      {tip.image ? (
        <Image source={{ uri: tip.image }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="bulb-outline" size={moderateScale(28)} color={iconColor} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {tip.title}
        </Text>
        <Text style={styles.cardExcerpt} numberOfLines={2}>
          {tip.body}
        </Text>
        <Text style={styles.readMore}>{t(LocalizedStrings.tips.readMore)}</Text>
      </View>
    </Pressable>
  );
});

const TipCardSkeleton = memo(function TipCardSkeleton({
  styles,
}: {
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={verticalScale(100)} borderRadius={0} />
      <View style={styles.cardBody}>
        <Skeleton width="85%" height={moderateScale(14)} />
        <Skeleton width="100%" height={moderateScale(12)} style={styles.skeletonGap} />
        <Skeleton width="60%" height={moderateScale(12)} style={styles.skeletonGap} />
      </View>
    </View>
  );
});

interface TipsRowProps {
  /** Horizontal inset for the header + list; defaults to the theme's lg spacing. */
  horizontalInset?: number;
  /**
   * Which block this is when the row appears several times in a feed — each slot shows
   * the next `count` tips (wrapping). Omit `count` to show all loaded tips.
   */
  slot?: number;
  count?: number;
}

/**
 * Horizontal "Health tips" strip — used at the bottom of Home and at the top of the
 * Community feed (next to suggested groups). Tapping a card opens /tips/[tipId].
 *
 * Only for users who opted in to tips during onboarding (Coaching & Tips): the query
 * is skipped for an explicit opt-out, and the backend returns an empty list for
 * anyone not opted in — in both cases this renders nothing, so it never leaves an
 * empty box behind.
 *
 * STRUCTURE IS DELIBERATELY STABLE. This used to `return null` until tips arrived and
 * swap a skeleton View for a horizontal FlatList — both change the parent's Yoga
 * children at the exact commit the response lands, which is the Fabric/Yoga
 * "ABA ownership" crash (YGNodeGetOwner(childYogaNode) == &yogaNode_, RN 0.79,
 * facebook/react-native#52349) that killed the Home screen ~1.5s after launch. So the
 * container, header and scroller are always mounted; "nothing to show" just collapses
 * the container to height 0, and only the scroller's *children* change. A plain
 * horizontal ScrollView (≤ MAX_TIPS cards) replaces the FlatList, so no cards are
 * mounted/unmounted by windowing while scrolling either.
 */
function TipsRow({ horizontalInset, slot = 0, count = MAX_TIPS }: TipsRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => createStyles(theme, horizontalInset ?? theme.spacing.lg),
    [theme, horizontalInset],
  );
  const { data, isLoading, isFetching } = useTips(MAX_TIPS);
  // One shared query for every TipsRow on screen (same key) — react-query dedupes it.
  const tips = useMemo(() => cycleWindow(data?.tips ?? [], slot, count), [data?.tips, slot, count]);

  // First load (nothing cached yet): skeleton cards.
  const showSkeleton = isLoading && isFetching;
  // Nothing to show (opted out, or no tips): collapse instead of unmounting — see above.
  const isEmpty = !showSkeleton && tips.length === 0;

  return (
    <View
      style={[styles.container, isEmpty && styles.collapsed]}
      pointerEvents={isEmpty ? "none" : "auto"}
      accessibilityElementsHidden={isEmpty}
      importantForAccessibility={isEmpty ? "no-hide-descendants" : "auto"}
    >
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons
            name="bulb-outline"
            size={moderateScale(18)}
            color={theme.colors.text.primary}
          />
          <Text style={styles.title}>{t(LocalizedStrings.tips.title)}</Text>
        </View>
        <TouchableOpacity onPress={openAllTips} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.seeAll}>{t(LocalizedStrings.tips.seeAll)}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {showSkeleton
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <TipCardSkeleton key={`skeleton-${i}`} styles={styles} />
            ))
          : tips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                styles={styles}
                iconColor={theme.colors.slateCharcoal}
                onOpen={openTip}
              />
            ))}
      </ScrollView>
    </View>
  );
}

export default memo(TipsRow);

const createStyles = (theme: Theme, inset: number) =>
  StyleSheet.create({
    container: {
      paddingTop: verticalScale(4),
      paddingBottom: verticalScale(16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: inset,
      marginBottom: verticalScale(10),
    },
    headerTitle: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
    },
    seeAll: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      color: theme.colors.primary.dark,
    },
    title: {
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    listContent: {
      paddingHorizontal: inset,
      gap: scale(10),
    },
    collapsed: {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      overflow: "hidden",
    },
    card: {
      width: scale(230),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(12),
      overflow: "hidden",
    },
    cover: {
      width: "100%",
      height: verticalScale(100),
    },
    coverPlaceholder: {
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: {
      padding: scale(12),
    },
    cardTitle: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
      minHeight: verticalScale(36),
    },
    cardExcerpt: {
      marginTop: verticalScale(4),
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.text.secondary,
      lineHeight: verticalScale(16),
    },
    readMore: {
      marginTop: verticalScale(8),
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.primary.dark,
    },
    skeletonGap: {
      marginTop: verticalScale(6),
    },
  });
