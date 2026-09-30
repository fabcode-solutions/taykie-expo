import React, { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaScreen, ThemeText } from "@/components";
import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyView from "@/components/ui/empty-view";
import { openTip } from "@/components/tips/TipsRow";
import { useInfiniteTips } from "@/hooks/queries/tips";
import { Tip } from "@/services/api/tips";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

type TipsStyles = ReturnType<typeof createStyles>;

const PAGE_SIZE = 10;
const keyExtractor = (item: Tip) => item.id;

const formatDate = (value: string | null | undefined, language: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric" });
};

const TipListItem = memo(function TipListItem({
  tip,
  styles,
  iconColor,
}: {
  tip: Tip;
  styles: TipsStyles;
  iconColor: string;
}) {
  const { i18n } = useTranslation();
  const handlePress = useCallback(() => openTip(tip.id), [tip.id]);
  const date = formatDate(tip.publishedAt ?? tip.createdAt, i18n.language);

  return (
    <Pressable style={styles.item} onPress={handlePress} accessibilityRole="button">
      {tip.image ? (
        <Image source={{ uri: tip.image }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="bulb-outline" size={moderateScale(24)} color={iconColor} />
        </View>
      )}
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {tip.title}
        </Text>
        <Text style={styles.itemExcerpt} numberOfLines={2}>
          {tip.body}
        </Text>
        {!!date && <Text style={styles.itemDate}>{date}</Text>}
      </View>
    </Pressable>
  );
});

const TipListItemSkeleton = memo(function TipListItemSkeleton({ styles }: { styles: TipsStyles }) {
  return (
    <View style={styles.item}>
      <Skeleton width={scale(72)} height={scale(72)} borderRadius={moderateScale(10)} />
      <View style={[styles.itemBody, styles.skeletonBody]}>
        <Skeleton width="80%" height={moderateScale(14)} />
        <Skeleton width="100%" height={moderateScale(12)} />
        <Skeleton width="35%" height={moderateScale(11)} />
      </View>
    </View>
  );
});

/** Every published health tip, newest first ("See all" from the tips strips). */
export default function TipsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteTips(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tips = useMemo(() => data?.pages.flatMap((page) => page.tips) ?? [], [data?.pages]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch().catch(() => {});
    setIsRefreshing(false);
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Tip }) => (
      <TipListItem tip={item} styles={styles} iconColor={theme.colors.slateCharcoal} />
    ),
    [styles, theme.colors.slateCharcoal],
  );

  // Header / footer / empty passed as stable elements (wrappers always mounted).
  const headerElement = useMemo(
    () => (
      <View style={styles.header}>
        <BackButton />
        <ThemeText variant="manrope.h2" style={styles.title}>
          {t(LocalizedStrings.tips.title)}
        </ThemeText>
      </View>
    ),
    [styles, t],
  );

  const footerElement = useMemo(
    () => <View>{isFetchingNextPage ? <TipListItemSkeleton styles={styles} /> : null}</View>,
    [isFetchingNextPage, styles],
  );

  const emptyElement = useMemo(
    () => (
      <View>
        {isLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 5 }).map((_, i) => (
              <TipListItemSkeleton key={i} styles={styles} />
            ))}
          </View>
        ) : (
          <EmptyView message={t(LocalizedStrings.tips.empty)} />
        )}
      </View>
    ),
    [isLoading, styles, t],
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />,
    [isRefreshing, handleRefresh],
  );

  return (
    <SafeAreaScreen style={styles.screen}>
      <FlatList
        data={tips}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={headerElement}
        ListFooterComponent={footerElement}
        ListEmptyComponent={emptyElement}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    content: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
      paddingBottom: verticalScale(60),
      gap: verticalScale(12),
    },
    header: {
      marginBottom: verticalScale(8),
    },
    title: {
      marginTop: verticalScale(24),
      fontSize: moderateScale(24),
      fontFamily: fontFamily.gascogneSerial.regular,
      fontWeight: "400" as const,
      color: theme.colors.text.primary,
    },
    list: {
      gap: verticalScale(12),
    },
    item: {
      flexDirection: "row",
      gap: scale(12),
      padding: scale(12),
      borderRadius: moderateScale(12),
      backgroundColor: theme.colors.white,
    },
    thumb: {
      width: scale(72),
      height: scale(72),
      borderRadius: moderateScale(10),
    },
    thumbPlaceholder: {
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    itemBody: {
      flex: 1,
    },
    skeletonBody: {
      gap: verticalScale(8),
    },
    itemTitle: {
      fontSize: moderateScale(15),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    itemExcerpt: {
      marginTop: verticalScale(4),
      fontSize: moderateScale(13),
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.text.secondary,
      lineHeight: verticalScale(18),
    },
    itemDate: {
      marginTop: verticalScale(6),
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.primary.dark,
    },
  });
