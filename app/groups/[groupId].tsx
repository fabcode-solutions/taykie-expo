import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  TextInput,
  Platform,
} from "react-native";
import { ParallaxScrollView, SafeAreaScreen, ThemeStatusBar } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Images } from "@/assets";
import { GroupDetailsHero } from "@/components/groups/GroupDetailsHero";
import IconMembers from "@/components/icons/IconMembers";
import IconImage from "@/components/icons/IconImage";
import IconPoll from "@/components/icons/IconPoll";
import { useGroupStore } from "@/stores/groupStore";
import { getFullYear } from "@/utils/formatter";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { formatDistanceToNow } from "date-fns";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";
import { GroupMember } from "@/services/repositories/groups";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { Button } from "@/components/ui/button";

const HEADER_MAX_HEIGHT = Dimensions.get("screen").height / 1.3;
const HEADER_MIN_HEIGHT = Dimensions.get("screen").height / 2.2;

export default function SingleGroupScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const [textPost, setTextPost] = useState("");
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { fetchGroupById, group, joinGroup, leaveGroup, fetchRecommendedGroups, isLoading } =
    useGroupStore();

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const fetchGroupDetails = useCallback(async () => {
    try {
      await fetchGroupById(groupId);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [groupId]);

  const joinedBy = useMemo(() => {
    // 1. Safety check for the specific structure of your JSON
    if (!group?.members || group.members.length === 0) return "";

    const members = group.members;
    // Fallback to array length if membersCount isn't provided
    const totalCount = group.membersCount ?? members.length;

    // Helper to extract name safely from the nested user object
    const getName = (member: GroupMember) => member.user?.firstName || "";

    // 2. Logic for 2 or fewer total members
    if (totalCount <= 2) {
      return members.map(getName).filter(Boolean).join(", ");
    }

    // 3. Logic for more than 2 members
    const firstTwo = members.slice(0, 2).map(getName).filter(Boolean).join(", ");

    const remaining = totalCount - 2;

    const andText = t(LocalizedStrings.auth.signup.legal.and);
    const label =
      remaining === 1 ? t(LocalizedStrings.common.other) : t(LocalizedStrings.common.others);

    return `${firstTwo} ${andText} ${remaining} ${label}`;
  }, [group, t]);

  const handleJoinLeaveGroup = useCallback(async () => {
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
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [group?.isMember, groupId]);

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaScreen
        showLoader={isLoading}
        withBackground={false}
        edges={["left", "right", "bottom"]}
        style={[styles.screen, { backgroundColor: theme.colors.background.default }]}
      >
        <ThemeStatusBar style="light" />
        <ParallaxScrollView
          headerHeight={HEADER_MAX_HEIGHT}
          headerMinHeight={HEADER_MIN_HEIGHT}
          contentOverlapsHeader={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: HEADER_MAX_HEIGHT,
              backgroundColor: theme.colors.background.default,
              borderRadius: 20,
            },
          ]}
          scrollViewProps={{ showsVerticalScrollIndicator: false }}
          renderHeader={({ scrollY, headerScrollDistance, headerHeight }) => {
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
                imageUri={
                  group?.uploadGroupPhoto ? { uri: group?.uploadGroupPhoto } : Images.authStart
                }
                heroSlidesLabel={"d"}
                onBack={router.back}
                imageScale={imageScale}
                imageTranslateY={imageTranslateY}
                overlayOpacity={overlayOpacity}
                topRowTranslateY={topRowTranslateY}
              />
            );
          }}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.parallaxInner}>
              <View style={styles.groupWrapper}>
                <Text style={styles.groupTitle}>{group?.groupName}</Text>
                <View style={styles.groupMembers}>
                  <IconMembers />
                  <Text style={styles.memberCount}>{group?.membersCount}</Text>
                </View>
              </View>

              <Text style={styles.groupDescription}>{group?.groupDescription}</Text>
              <View style={styles.groupJoin}>
                <Text style={styles.memberCount}>{t(LocalizedStrings.groups.joinedBy)}</Text>
                <Text style={[styles.memberCount, styles.strong]}>{joinedBy}</Text>
              </View>
              <View style={styles.infoWrapper}>
                <View style={styles.info}>
                  <Text style={styles.memberCount}>
                    {t(LocalizedStrings.common.since)}: {getFullYear(group?.createdAt ?? "")}
                  </Text>
                  <View style={styles.dot} />
                  <Text style={styles.memberCount}>
                    {t(LocalizedStrings.groups.lastActivity)}:{" "}
                    {group?.updatedAt
                      ? formatDistanceToNow(new Date(group.updatedAt), { addSuffix: true })
                      : t(LocalizedStrings.device.compartments.noActivity)}
                  </Text>
                </View>
                <Button
                  fullWidth={false}
                  size="small"
                  textStyle={{ fontSize: moderateScale(14) }}
                  title={
                    group?.isMember
                      ? t(LocalizedStrings.groups.leaveGroup)
                      : t(LocalizedStrings.groups.joinGroup)
                  }
                  onPress={handleJoinLeaveGroup}
                  disabled={group?.userRole === "SuperAdmin"}
                />
              </View>
              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  onChangeText={setTextPost}
                  value={textPost}
                  maxLength={250}
                  placeholderTextColor={theme.colors.text.secondary}
                  placeholder={t(LocalizedStrings.groups.writeSomething)}
                />
                <Text style={styles.letterCount}>{textPost.length}/250</Text>
                <View style={styles.postIcons}>
                  <TouchableOpacity>
                    <IconImage />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <IconPoll />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ParallaxScrollView>
      </SafeAreaScreen>
    </KeyboardAvoidingView>
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
      marginVertical: verticalScale(15),
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
