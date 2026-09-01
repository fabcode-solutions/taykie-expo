import { fontFamily, Theme, useTheme } from "@/theme";
import { GroupResponse } from "@/types/groups.types";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../ui/button";
import { ThemeText } from "../primitives";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";

const GroupCard = ({ item }: { item: GroupResponse }) => {
  const theme = useTheme();
  const router = useRouter();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const getInitials = (name: string) => {
    if (!name) return "?"; // Fallback if name is also missing
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  return (
    <TouchableOpacity
      onPress={() => {
        router.push(`/groups/${item.id}`);
      }}
      style={styles.parent}
    >
      <View style={styles.view}>
        {item.uploadGroupPhoto && (
          <View style={styles.recGroupIcon}>
            <Image
              style={styles.child}
              source={{ uri: item.uploadGroupPhoto }}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.frameParent}>
          <View style={styles.vitalBoostTribeParent}>
            <Text style={styles.vitalBoostTribe}>{item.groupName}</Text>
            {item.groupDescription && (
              <Text style={[styles.aCommunityFor, styles.textClr]}>{item.groupDescription}</Text>
            )}
          </View>
          <View style={[styles.frameGroup, styles.frameFlexBox]}>
            <View style={[styles.frameContainer, styles.frameFlexBox]}>
              {(item?.previewMembers?.length ?? 0) > 0 && (
                <View style={[styles.ellipseParent, styles.frameFlexBox, { alignItems: "center" }]}>
                  {/* 1. Limit to the first 3 members using slice() */}
                  {item?.previewMembers?.slice(0, 3).map((member, index) =>
                    // 2. Fixed logic: if avatarUrl exists, show Image. Otherwise, show initials.
                    member.avatarUrl ? (
                      <Image
                        key={index}
                        style={styles.frameChild}
                        source={{ uri: member.avatarUrl }}
                        resizeMode="cover"
                      />
                    ) : (
                      <ThemeText
                        key={index}
                        // Added styles.frameChild so the initials container is the exact same size/shape as the images
                        style={[
                          styles.frameChild,
                          { padding: verticalScale(5), textAlignVertical: "center" },
                        ]}
                        align="center"
                        variant="manrope.caption"
                      >
                        {getInitials(`${member.firstName} ${member.lastName}`)}
                      </ThemeText>
                    ),
                  )}
                </View>
              )}

              {(item.previewMembers?.length ?? 0) > 3 && (
                <Text style={[styles.text, styles.textTypo, { marginLeft: scale(6) }]}>
                  +{(item.previewMembers?.length ?? 0) - 3} {t(LocalizedStrings.common.others)}
                </Text>
              )}
            </View>
          </View>
          <Button
            fullWidth={false}
            style={{ right: 0, position: "absolute", bottom: 0, minHeight: verticalScale(24) }}
            textStyle={{ fontSize: moderateScale(14) }}
            size="small"
            title={t(LocalizedStrings.common.view)}
            onPress={() => router.push(`/groups/${item.id}`)}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default GroupCard;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    parent: {
      backgroundColor: theme.colors.white,
      flex: 1,
      borderRadius: moderateScale(10),
    },
    textClr: {
      color: theme.colors.primary.dark,
      textAlign: "left",
    },
    frameFlexBox: {
      flexDirection: "row",
      alignItems: "center",
    },
    textTypo: {
      fontFamily: "Manrope-Medium",
      fontWeight: "500",
      fontSize: moderateScale(12),
    },

    view: {
      padding: verticalScale(10),
      paddingBottom: verticalScale(16),
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    child: {
      aspectRatio: 1,
      height: verticalScale(30),
      borderRadius: moderateScale(20),
    },
    frameParent: {
      paddingHorizontal: scale(10),
      gap: verticalScale(10),
      flex: 1,
    },
    frameWrapper: {},
    vitalBoostTribeParent: {
      gap: verticalScale(3),
    },
    vitalBoostTribe: {
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      textAlign: "left",
      fontSize: moderateScale(15),
      color: theme.colors.text.primary,
    },
    aCommunityFor: {
      fontSize: moderateScale(13),
      fontFamily: "Manrope-Regular",
      alignSelf: "stretch",
    },
    frameGroup: {
      justifyContent: "space-between",
      gap: verticalScale(20),
    },
    frameContainer: {
      gap: verticalScale(10),
    },
    ellipseParent: {
      gap: verticalScale(5),
      backgroundColor: theme.colors.primary.main,
      borderRadius: 999,
    },
    frameChild: {
      height: verticalScale(30),
      aspectRatio: 1,
      borderRadius: moderateScale(30),
    },
    text: {
      color: theme.colors.primary.dark,
    },
    groupChild: {
      marginLeft: -scale(30),
      top: 0,
      borderRadius: moderateScale(50),
      backgroundColor: theme.colors.primary.main,
      width: scale(60),
      height: verticalScale(24),
    },

    recGroupIcon: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: 999,
      backgroundColor: theme.colors.background.default,
      justifyContent: "center",
      alignItems: "center",
    },
  });
