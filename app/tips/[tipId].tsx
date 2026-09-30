import React, { memo, useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaScreen, ThemeText } from "@/components";
import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyView from "@/components/ui/empty-view";
import { useTip } from "@/hooks/queries/tips";
import { Tip } from "@/services/api/tips";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

type TipStyles = ReturnType<typeof createStyles>;

const formatDate = (value: string | null | undefined, language: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" });
};

const TipDetailSkeleton = memo(function TipDetailSkeleton({ styles }: { styles: TipStyles }) {
  return (
    <View>
      <Skeleton width="100%" height={verticalScale(200)} borderRadius={moderateScale(16)} />
      <View style={styles.skeletonBody}>
        <Skeleton width="80%" height={moderateScale(22)} />
        <Skeleton width="40%" height={moderateScale(12)} />
        <Skeleton width="100%" height={moderateScale(14)} />
        <Skeleton width="100%" height={moderateScale(14)} />
        <Skeleton width="92%" height={moderateScale(14)} />
        <Skeleton width="70%" height={moderateScale(14)} />
      </View>
    </View>
  );
});

const TipContent = memo(function TipContent({
  tip,
  styles,
  iconColor,
}: {
  tip: Tip;
  styles: TipStyles;
  iconColor: string;
}) {
  const { t, i18n } = useTranslation();
  const published = formatDate(tip.publishedAt ?? tip.createdAt, i18n.language);
  const authorName = [tip.author?.firstName, tip.author?.lastName].filter(Boolean).join(" ");
  const tags = Array.isArray(tip.tags) ? tip.tags.filter(Boolean) : [];

  return (
    <View>
      {tip.image ? (
        <Image source={{ uri: tip.image }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="bulb-outline" size={moderateScale(48)} color={iconColor} />
        </View>
      )}

      <Text style={styles.label}>{t(LocalizedStrings.tips.tip)}</Text>
      <ThemeText variant="manrope.h2" style={styles.title}>
        {tip.title}
      </ThemeText>

      {(!!published || !!authorName) && (
        <Text style={styles.meta}>
          {[
            authorName ? t(LocalizedStrings.tips.byAuthor, { name: authorName }) : null,
            published ? t(LocalizedStrings.tips.publishedOn, { date: published }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      )}

      {tags.length > 0 && (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.body}>{tip.body}</Text>
    </View>
  );
});

export default function TipDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { tipId } = useLocalSearchParams<{ tipId: string }>();
  const { data: tip, isLoading, isError } = useTip(tipId ?? "");

  return (
    <SafeAreaScreen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        {/* Stable wrapper: only its contents swap between skeleton / tip / error. */}
        <View style={styles.main}>
          {isLoading ? (
            <TipDetailSkeleton styles={styles} />
          ) : tip ? (
            <TipContent tip={tip} styles={styles} iconColor={theme.colors.slateCharcoal} />
          ) : (
            <EmptyView
              message={
                isError ? t(LocalizedStrings.tips.notFound) : t(LocalizedStrings.tips.loadFailed)
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
      paddingBottom: verticalScale(60),
    },
    main: {
      marginTop: verticalScale(20),
    },
    cover: {
      width: "100%",
      height: verticalScale(200),
      borderRadius: moderateScale(16),
    },
    coverPlaceholder: {
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    label: {
      marginTop: verticalScale(20),
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.colors.primary.dark,
    },
    title: {
      marginTop: verticalScale(6),
      fontSize: moderateScale(24),
      fontFamily: fontFamily.gascogneSerial.regular,
      fontWeight: "400" as const,
      color: theme.colors.text.primary,
    },
    meta: {
      marginTop: verticalScale(8),
      fontSize: moderateScale(13),
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.secondary,
    },
    tags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(6),
      marginTop: verticalScale(12),
    },
    tag: {
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(4),
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: theme.colors.white,
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    body: {
      marginTop: verticalScale(18),
      fontSize: moderateScale(15),
      fontFamily: fontFamily.manrope.regular,
      lineHeight: verticalScale(24),
      color: theme.colors.text.primary,
    },
    skeletonBody: {
      marginTop: verticalScale(20),
      gap: verticalScale(12),
    },
  });
