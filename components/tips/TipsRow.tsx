import React, { memo, useCallback, useMemo } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily, Theme, useTheme } from "@/theme";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTips } from "@/hooks/queries/tips";
import { Tip } from "@/services/api/tips";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

const MAX_TIPS = 10;
const SKELETON_COUNT = 2;

const keyExtractor = (item: Tip) => item.id;

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
}

/**
 * Horizontal "Health tips" strip — used at the bottom of Home and at the top of the
 * Community feed (next to suggested groups). Tapping a card opens /tips/[tipId].
 *
 * Only for users who opted in to tips during onboarding (Coaching & Tips): the query
 * is skipped for an explicit opt-out, and the backend returns an empty list for
 * anyone not opted in — in both cases this renders nothing, so it never leaves an
 * empty box behind.
 */
function TipsRow({ horizontalInset }: TipsRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => createStyles(theme, horizontalInset ?? theme.spacing.lg),
    [theme, horizontalInset],
  );
  const { data, isLoading, isFetching } = useTips(MAX_TIPS);
  const tips = data?.tips ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Tip }) => (
      <TipCard tip={item} styles={styles} iconColor={theme.colors.slateCharcoal} onOpen={openTip} />
    ),
    [styles, theme.colors.slateCharcoal],
  );

  // First load (nothing cached yet): skeleton cards.
  const showSkeleton = isLoading && isFetching;
  if (!showSkeleton && tips.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={moderateScale(18)} color={theme.colors.text.primary} />
        <Text style={styles.title}>{t(LocalizedStrings.tips.title)}</Text>
      </View>
      {showSkeleton ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <TipCardSkeleton key={i} styles={styles} />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={tips}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
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
      gap: scale(6),
      paddingHorizontal: inset,
      marginBottom: verticalScale(10),
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
    skeletonRow: {
      flexDirection: "row",
      paddingHorizontal: inset,
      gap: scale(10),
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
