import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Image,
  Pressable,
  Alert,
  FlatList,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeInput, ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import IconSearch from "@/components/icons/IconSearch";
import BackButton from "@/components/BackButton";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import EmptyView from "@/components/ui/empty-view";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationRequest } from "@/services/api/notification";
import { Loader } from "@/components/shared/loader";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";

export default function FollowScreen() {
  const params = useLocalSearchParams();
  const alert = useAlert();
  const { type } = params;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    user,
    stats,
    isLoading,
    fetchFollowersList,
    fetchFollowingList,
    followers,
    following,
    suggestionList,
    followUserId,
    unFollowUserId,
    fetchSuggestionList,
  } = useAuthStore();
  const { sendNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(type);
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (name: string) => {
    if (!name) return "?"; // Fallback if name is also missing
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    if (activeTab === "Following") {
      fetchUserFollowing();
    } else {
      fetchUserFollowers();
    }
  }, [activeTab]);
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const fetchUserFollowers = useCallback(async () => {
    try {
      await fetchFollowersList();
      await fetchSuggestionList();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [stats, followers]);

  const fetchUserFollowing = useCallback(async () => {
    try {
      await fetchFollowingList();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [stats, following]);

  const handleFollowUnFollow = useCallback(
    async (userId: string) => {
      try {
        let message = "";
        let request: NotificationRequest = {
          fromUserId: user?.id,
          toUserId: userId,
          type: "Follow",
          heading: t(LocalizedStrings.follow.new_follower),
          context: t("follow.started_following", { user: user?.firstName }),
        };
        if (activeTab === "Followers") {
          message = await followUserId(userId);
        } else {
          request = {
            ...request,
            heading: t(LocalizedStrings.follow.unfollowed_you),
            context: t("follow.unfollowed_User", { user: user?.firstName }),
          };
          message = await unFollowUserId(userId);
        }
        await createNotification(request);
        alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [activeTab, t],
  );

  const createNotification = useCallback(async (request: NotificationRequest) => {
    try {
      await sendNotification(request);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const filteredList = useMemo(() => {
    const list = activeTab === "Following" ? following : followers;
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.firstName?.toLowerCase().includes(query) ||
        item.lastName?.toLowerCase().includes(query) ||
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(query),
    );
  }, [activeTab, following, followers, searchQuery]);

  const showSearchBar = useMemo(() => {
    return (activeTab === "Followers" ? followers : following).length > 0;
  }, [activeTab, followers, following]);

  return (
    <>
      {isLoading && <Loader />}
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={styles.container}>
          <BackButton />
          <View style={[styles.headerRow]}>
            <ThemeText variant="manrope.h2" style={styles.header}>
              {t(LocalizedStrings.follow.combine_title)}
            </ThemeText>
          </View>
          <View>
            <View style={styles.followTabs}>
              <Pressable
                onPress={() => setActiveTab("Followers")}
                style={[styles.followTab, activeTab === "Followers" && styles.followTabActive]}
              >
                <Text
                  style={[
                    styles.followTabText,
                    activeTab === "Followers" && styles.followTabTextActive,
                  ]}
                >
                  {t(LocalizedStrings.follow.followers)}
                </Text>
                <Text
                  style={[
                    styles.followTabText,
                    activeTab === "Followers" && styles.followTabTextActive,
                  ]}
                >
                  {stats?.followersCount}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("Following")}
                style={[styles.followTab, activeTab === "Following" && styles.followTabActive]}
              >
                <Text
                  style={[
                    styles.followTabText,
                    activeTab === "Following" && styles.followTabTextActive,
                  ]}
                >
                  {t(LocalizedStrings.follow.following)}
                </Text>
                <Text
                  style={[
                    styles.followTabText,
                    activeTab === "Following" && styles.followTabTextActive,
                  ]}
                >
                  {stats?.followingCount}
                </Text>
              </Pressable>
            </View>
            {showSearchBar && (
              <View style={styles.searchWrapper}>
                <ThemeInput
                  placeholder={t(LocalizedStrings.groups.searchUsers)}
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
              </View>
            )}

            {activeTab === "Following" && (
              <FlatList
                style={{ height: "100%" }}
                data={filteredList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.userItem}>
                    <View style={styles.userItemLeft}>
                      <TouchableOpacity style={styles.userItemInter}>
                        <View style={styles.userItemImage}>
                          {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.userItemImage} />
                          ) : (
                            <ThemeText variant="manrope.body1Bold">
                              {getInitials(`${item.firstName} ${item.lastName}`)}
                            </ThemeText>
                          )}
                        </View>
                        <View>
                          <Text style={styles.userItemName}>{item.firstName}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.userItemBtn}
                      onPress={() => handleFollowUnFollow(item.id)}
                    >
                      <Text style={styles.userItemBtnText}>
                        {t(LocalizedStrings.follow.unfollow)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <EmptyView
                    title={t(LocalizedStrings.follow.empty.no_following)}
                    message={t(LocalizedStrings.follow.empty.no_following_desc)}
                  />
                }
              />
            )}

            {activeTab === "Followers" && (
              <FlatList
                data={filteredList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.userItem}>
                    <View style={styles.userItemLeft}>
                      <TouchableOpacity style={styles.userItemInter}>
                        <View style={styles.userItemImage}>
                          {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.userItemImage} />
                          ) : (
                            <ThemeText variant="manrope.body1Bold">
                              {getInitials(`${item.firstName} ${item.lastName}`)}
                            </ThemeText>
                          )}
                        </View>
                        <View>
                          <Text style={styles.userItemName}>{item.firstName}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.userItemBtn}
                      onPress={() =>
                        !item.isFriend
                          ? handleFollowUnFollow(item.id)
                          : Alert.alert("Message", "Messaging feature coming soon!")
                      }
                    >
                      <Text style={styles.userItemBtnText}>
                        {item.isFriend
                          ? t(LocalizedStrings.follow.message)
                          : t(LocalizedStrings.follow.follow_back)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <EmptyView
                    title={t(LocalizedStrings.follow.empty.no_followers)}
                    message={t(LocalizedStrings.follow.empty.no_followers_desc)}
                  />
                }
              />
            )}

            {activeTab === "Followers" && suggestionList.length > 0 && (
              <FlatList
                ListHeaderComponent={
                  <Text style={[styles.userItemName, styles.heading]}>
                    {t(LocalizedStrings.follow.forYou)}
                  </Text>
                }
                data={suggestionList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.userItem}>
                    <View style={styles.userItemLeft}>
                      <TouchableOpacity style={styles.userItemInter}>
                        <View style={styles.userItemImage}>
                          {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.userItemImage} />
                          ) : (
                            <ThemeText variant="manrope.body1Bold">
                              {getInitials(`${item.firstName} ${item.lastName}`)}
                            </ThemeText>
                          )}
                        </View>
                        <View>
                          <Text style={styles.userItemName}>{item.firstName}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.userItemBtn}
                      onPress={() => handleFollowUnFollow(item.id)}
                    >
                      <Text style={styles.userItemBtnText}>{t(LocalizedStrings.follow.title)}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </Pressable>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    searchWrapper: {
      marginTop: verticalScale(20),
      overflow: "hidden",
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
      gap: verticalScale(20),
    },
    searchContainer: {
      borderRadius: moderateScale(60),
      borderColor: theme.colors.white,
      padding: 0,
      height: verticalScale(40),
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
      marginTop: verticalScale(10),
      alignItems: "center",
      justifyContent: "space-between",
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
    followTabs: {
      flexDirection: "row",
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
    },
    followTab: {
      flex: 1,
      borderRadius: moderateScale(10),
      flexDirection: "row",
      padding: verticalScale(9),
      justifyContent: "center",
      gap: scale(14),
    },
    followTabActive: { backgroundColor: theme.colors.primary.main },
    followTabText: {
      fontSize: moderateScale(16),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.divider,
    },
    followTabTextActive: {
      color: theme.colors.text.primary,
    },
    userItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
    },
    userItemLeft: {
      flexDirection: "row",
    },
    userItemInter: {
      flexDirection: "row",
      gap: scale(10),
      alignItems: "center",
    },
    userItemImage: {
      aspectRatio: 1,
      height: verticalScale(50),
      objectFit: "cover",
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    userItemName: {
      fontSize: moderateScale(16),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    userItemDeg: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.primary.dark,
    },
    userItemBtn: {
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
      borderColor: "#DADADA",
      borderWidth: scale(1),
      borderRadius: moderateScale(70),
    },
    userItemBtnText: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    heading: {
      marginTop: verticalScale(30),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
    },
  });
