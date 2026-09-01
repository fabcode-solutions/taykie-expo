import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Image,
  Platform,
  RefreshControl,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeInput, ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Button } from "@/components/ui/button";
import IconSearch from "@/components/icons/IconSearch";
import IconAdd from "@/components/icons/IconAdd";
import { ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import IconClose from "@/components/icons/IconClose";
import GroupCard from "@/components/groups/GroupCard";
import { useGroupStore } from "@/stores/groupStore";
import { Loader } from "@/components/shared/loader";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import EmptyView from "@/components/ui/empty-view";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const {
    isLoading,
    fetchUserGroups,
    userGroups,
    fetchRecommendedGroups,
    recommendedGroups,
    joinGroup,
  } = useGroupStore();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      await fetchUserGroups();
      await fetchRecommendedGroups();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [fetchRecommendedGroups, fetchUserGroups]);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleGroupJoin = React.useCallback(async (id: string) => {
    try {
      const message = await joinGroup(id);
      await fetchRecommendedGroups();
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const filteredGroups = useMemo(() => {
    // 1. Clean the query (remove extra spaces)
    const query = searchQuery.trim().toLowerCase();

    if (query === "") {
      return userGroups;
    }

    return userGroups.filter((group) => {
      // 2. Ensure groupName exists and convert to lowercase
      const name = group?.groupName?.toLowerCase() ?? "";

      // 3. Check if the name contains the single word/query
      return name.includes(query);
    });
  }, [userGroups, searchQuery]);
  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {isLoading && <Loader />}
      <SafeAreaView>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: verticalScale(80) }}
          refreshControl={<RefreshControl onRefresh={fetchUserGroups} refreshing={isLoading} />}
        >
          <View>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backButtonInner}>
                <IconBackArrow />
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.headerRow]}>
            <ThemeText variant="manrope.h2" style={styles.header}>
              {t(LocalizedStrings.groups.myGroups)}
            </ThemeText>
            <View style={styles.rightIcons}>
              <TouchableOpacity onPress={() => setShowSearch((prev) => !prev)}>
                {showSearch ? (
                  <IconClose />
                ) : (
                  <IconSearch
                    width={moderateScale(20)}
                    height={moderateScale(20)}
                    stroke={theme.colors.text.primary}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/groups/create-group")}>
                <IconAdd />
              </TouchableOpacity>
            </View>
          </View>
          {showSearch && (
            <Animated.View
              style={styles.searchWrapper}
              entering={FadeInDown.duration(300)}
              exiting={FadeOutDown.duration(300)}
            >
              <ThemeInput
                placeholder={t(LocalizedStrings.groups.searchGroups)}
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon={<IconSearch />}
                rightIcon={
                  isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary.main} />
                  ) : searchQuery ? (
                    <TouchableOpacity onPress={handleClearSearch}>
                      <Ionicons
                        name="close-circle"
                        size={moderateScale(18)}
                        color={theme.colors.text.hint}
                      />
                    </TouchableOpacity>
                  ) : undefined
                }
                containerStyle={styles.searchContainer}
                placeholderClassName="text-[#B3B3B3] text-xs font-normal"
                returnKeyType="search"
              />
            </Animated.View>
          )}

          <FlatList
            contentContainerStyle={styles.groupsWrapper}
            data={filteredGroups}
            renderItem={({ item }) => <GroupCard item={item} />}
            ListEmptyComponent={
              <View style={styles.searchResultWrapper}>
                <Text style={styles.searchResultEmpty}>
                  {t(LocalizedStrings.groups.noGroupPart)}
                </Text>
              </View>
            }
          />

          <View style={styles.searchResultWrapper}>
            <Text style={styles.recommendHeading}>{t(LocalizedStrings.groups.recommended)}</Text>
          </View>

          <FlatList
            contentContainerStyle={styles.groupsWrapper}
            data={recommendedGroups}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recGroupWrapper}
                onPress={() => {
                  router.push(`/groups/${item.id}`);
                }}
              >
                <View style={styles.recGroupLeft}>
                  {item.uploadGroupPhoto && (
                    <View style={styles.recGroupIcon}>
                      <Image
                        style={styles.frameChild}
                        width={moderateScale(20)}
                        height={moderateScale(20)}
                        source={{ uri: item.uploadGroupPhoto }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View>
                    <Text style={styles.recGroupHeading}>{item.groupName}</Text>
                    <Text style={styles.recGroupMember}>
                      {item.membersCount}{" "}
                      {item.membersCount > 1
                        ? t(LocalizedStrings.groups.members)
                        : t(LocalizedStrings.groups.member)}
                    </Text>
                  </View>
                </View>
                <View>
                  <TouchableOpacity
                    onPress={() => handleGroupJoin(item.id)}
                    style={item.isMember ? styles.recGroupButtonActive : styles.recGroupButton}
                  >
                    <Text style={styles.recGroupBtnText}>
                      {item.isMember
                        ? t(LocalizedStrings.groups.joined)
                        : t(LocalizedStrings.groups.join)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <EmptyView message={t(LocalizedStrings.groups.no_recommendation_found)} />
            }
          />

          {userGroups.length === 0 && (
            <Button
              title={t(LocalizedStrings.groups.createFirstGroup)}
              onPress={() => router.push("/groups/create-group")}
              style={styles.button}
              textStyle={styles.btnTextStyle}
              rightIcon={null}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
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
    searchWrapper: {
      marginTop: verticalScale(20),
      overflow: "hidden",
    },
    searchResultWrapper: {
      marginTop: verticalScale(30),
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
      gap: scale(10),
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
  });
