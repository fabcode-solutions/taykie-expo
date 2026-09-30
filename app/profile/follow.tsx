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
import { UserListSkeleton } from "@/components/profile/ProfileSkeletons";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getInitials = (name: string) => {
  if (!name) return "?"; // Fallback if name is also missing
  const names = name.trim().split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const userKeyExtractor = (item: { id: string }) => item.id;

interface FollowUser {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  isFriend?: boolean;
}

interface UserRowProps {
  item: FollowUser;
  label: string;
  onAction: (item: FollowUser) => void;
  styles: ReturnType<typeof createStyles>;
}

// One row shared by the Following, Followers and suggestion lists; memoized so a
// change to one row does not re-render the rest.
const UserRow = React.memo(function UserRow({ item, label, onAction, styles }: UserRowProps) {
  const handlePress = useCallback(() => onAction(item), [onAction, item]);
  return (
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
      <TouchableOpacity style={styles.userItemBtn} onPress={handlePress}>
        <Text style={styles.userItemBtnText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
});

type FollowTabKey = "Followers" | "Following";

interface FollowTabProps {
  tabKey: FollowTabKey;
  label: string;
  count?: number;
  active: boolean;
  onSelect: (key: FollowTabKey) => void;
  styles: ReturnType<typeof createStyles>;
}

const FollowTab = React.memo(function FollowTab({
  tabKey,
  label,
  count,
  active,
  onSelect,
  styles,
}: FollowTabProps) {
  const handlePress = useCallback(() => onSelect(tabKey), [onSelect, tabKey]);
  return (
    <Pressable onPress={handlePress} style={[styles.followTab, active && styles.followTabActive]}>
      <Text style={[styles.followTabText, active && styles.followTabTextActive]}>{label}</Text>
      <Text style={[styles.followTabText, active && styles.followTabTextActive]}>{count}</Text>
    </Pressable>
  );
});

export default function FollowScreen() {
  const params = useLocalSearchParams();
  const alert = useAlert();
  const { type } = params;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((s) => s.user);
  const stats = useAuthStore((s) => s.stats);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fetchFollowersList = useAuthStore((s) => s.fetchFollowersList);
  const fetchFollowingList = useAuthStore((s) => s.fetchFollowingList);
  const followers = useAuthStore((s) => s.followers);
  const following = useAuthStore((s) => s.following);
  const suggestionList = useAuthStore((s) => s.suggestionList);
  const followUserId = useAuthStore((s) => s.followUserId);
  const unFollowUserId = useAuthStore((s) => s.unFollowUserId);
  const fetchSuggestionList = useAuthStore((s) => s.fetchSuggestionList);
  const sendNotification = useNotificationStore((s) => s.sendNotification);
  // isLoading is shared with the list fetches, so follow/unfollow tracks its own busy
  // flag: overlay for the action, skeletons for list loading.
  const [isActionBusy, setIsActionBusy] = useState(false);
  const isListLoading = isLoading && !isActionBusy;
  const [activeTab, setActiveTab] = useState<string | string[] | undefined>(type);
  const handleSelectTab = useCallback((key: FollowTabKey) => setActiveTab(key), []);
  const [searchQuery, setSearchQuery] = useState("");

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
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, [fetchFollowersList, fetchSuggestionList, alert]);

  const fetchUserFollowing = useCallback(async () => {
    try {
      await fetchFollowingList();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, [fetchFollowingList, alert]);

  const createNotification = useCallback(async (request: NotificationRequest) => {
    try {
      await sendNotification(request);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, []);

  const handleFollowUnFollow = useCallback(
    async (userId: string) => {
      setIsActionBusy(true);
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
            context: t(LocalizedStrings.follow.unfollowed_user, { user: user?.firstName }),
          };
          message = await unFollowUserId(userId);
        }
        await createNotification(request);
        alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      } finally {
        setIsActionBusy(false);
      }
    },
    [activeTab, user, followUserId, unFollowUserId, createNotification, alert],
  );

  const handleUnfollowUser = useCallback(
    (item: FollowUser) => handleFollowUnFollow(item.id),
    [handleFollowUnFollow],
  );
  const handleFollowerAction = useCallback(
    (item: FollowUser) => {
      if (!item.isFriend) {
        handleFollowUnFollow(item.id);
      } else {
        Alert.alert(
          t(LocalizedStrings.follow.message),
          t(LocalizedStrings.follow.messagingComingSoon),
        );
      }
    },
    [handleFollowUnFollow],
  );

  const renderFollowing = useCallback(
    ({ item }: { item: FollowUser }) => (
      <UserRow
        item={item}
        label={t(LocalizedStrings.follow.unfollow)}
        onAction={handleUnfollowUser}
        styles={styles}
      />
    ),
    [handleUnfollowUser, styles],
  );
  const renderFollower = useCallback(
    ({ item }: { item: FollowUser }) => (
      <UserRow
        item={item}
        label={
          item.isFriend
            ? t(LocalizedStrings.follow.message)
            : t(LocalizedStrings.follow.follow_back)
        }
        onAction={handleFollowerAction}
        styles={styles}
      />
    ),
    [handleFollowerAction, styles],
  );
  const renderSuggestion = useCallback(
    ({ item }: { item: FollowUser }) => (
      <UserRow
        item={item}
        label={t(LocalizedStrings.follow.title)}
        onAction={handleUnfollowUser}
        styles={styles}
      />
    ),
    [handleUnfollowUser, styles],
  );

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
      {isActionBusy && <Loader />}
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
              <FollowTab
                tabKey="Followers"
                label={t(LocalizedStrings.follow.followers)}
                count={stats?.followersCount}
                active={activeTab === "Followers"}
                onSelect={handleSelectTab}
                styles={styles}
              />
              <FollowTab
                tabKey="Following"
                label={t(LocalizedStrings.follow.following)}
                count={stats?.followingCount}
                active={activeTab === "Following"}
                onSelect={handleSelectTab}
                styles={styles}
              />
            </View>
            {showSearchBar && (
              <View style={styles.searchWrapper}>
                <ThemeInput
                  placeholder={t(LocalizedStrings.groups.searchUsers)}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  leftIcon={<IconSearch />}
                  rightIcon={
                    searchQuery ? (
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
                keyExtractor={userKeyExtractor}
                renderItem={renderFollowing}
                ListEmptyComponent={
                  isListLoading ? (
                    <UserListSkeleton />
                  ) : (
                    <EmptyView
                      title={t(LocalizedStrings.follow.empty.no_following)}
                      message={t(LocalizedStrings.follow.empty.no_following_desc)}
                    />
                  )
                }
              />
            )}

            {activeTab === "Followers" && (
              <FlatList
                data={filteredList}
                keyExtractor={userKeyExtractor}
                renderItem={renderFollower}
                ListEmptyComponent={
                  isListLoading ? (
                    <UserListSkeleton />
                  ) : (
                    <EmptyView
                      title={t(LocalizedStrings.follow.empty.no_followers)}
                      message={t(LocalizedStrings.follow.empty.no_followers_desc)}
                    />
                  )
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
                keyExtractor={userKeyExtractor}
                renderItem={renderSuggestion}
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
