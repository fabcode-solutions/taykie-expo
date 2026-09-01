import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

// UI & Theme
import { SafeAreaScreen, ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

// Icons & Components
import IconBackArrow from "@/components/icons/IconBackArrow";
import IconSettings from "@/components/icons/tabs/IconSettings";
import IconLocation from "@/components/icons/IconLocation";
import IconMail from "@/components/icons/IconMail";
import IconAdd from "@/components/icons/IconAdd";
import IconProduct from "@/components/icons/IconProduct";
import IconLogs from "@/components/icons/IconLogs";
import Tabs from "@/components/shared/tabs/Tabs";
import GroupCard from "@/components/groups/GroupCard";
import PostCard from "@/components/social/PostCard";
import EmptyView from "@/components/ui/empty-view";
import { Button } from "@/components/ui/button";

// Stores & Types
import { useAuthStore } from "@/stores/authStore";
import { usePostStore } from "@/stores/postStore";
import { useGroupStore } from "@/stores/groupStore";
import { COUNTRIES } from "../(onboarding)/country-language";
import { GroupResponse } from "@/types/groups.types";
import { CommunityPost } from "@/types/posts.types";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationRequest } from "@/services/api/notification";
import ScheduleModals from "@/components/schedule/ScheduleModals";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import IconGrid from "@/components/icons/settings/IconGrid";
import IconCapture from "@/components/icons/settings/IconCapture";
import IconBookmarked from "@/components/icons/IconBookmarked";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const theme = useTheme();
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<"posts" | "groups" | "saved">("posts");
  const [searchVisible, setSearchVisible] = useState(false);
  const { user, stats } = useAuthStore();
  const {
    fetchBookmarkedPosts,
    bookmarkedPost,
    fetchUserPosts,
    userPosts,
    unBookmarkPost,
    bookmarkPost,
    likePost,
    unLikePost,
    fetchPostComments,
  } = usePostStore();
  const { sendNotification } = useNotificationStore();
  const { userGroups, fetchUserGroups } = useGroupStore();

  const displayName = useMemo(() => {
    if (!user) return null;
    return user.firstName || (user.email || "").split("@")[0];
  }, [user]);

  const avatarInitial = displayName?.charAt(0).toUpperCase();

  const countryName = useMemo(() => {
    const match = COUNTRIES.find((country) => country?.code === user?.country);
    return match?.name ?? user?.country ?? "";
  }, [user?.country]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handleApiShare = useCallback(
    async (postId: string, isBookmarked: boolean) => {
      try {
        if (isBookmarked) {
          await unBookmarkPost(postId);
        } else {
          await bookmarkPost(postId);
        }
        // Only trigger a refetch if we are currently looking at the saved tab
        if (activeSegment === "saved") {
          await fetchBookmarkedPosts();
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [bookmarkPost, unBookmarkPost, activeSegment, fetchBookmarkedPosts, t],
  );

  const handleLike = useCallback(
    async (postId: string, isLiked: boolean, userId: string) => {
      try {
        let request: NotificationRequest = {
          fromUserId: user?.id,
          toUserId: userId,
          type: "Like",
          heading: t(LocalizedStrings.community.post.new_like),
          context: t("community.post.user_liked_post", { user: user?.firstName }),
        };
        if (isLiked) {
          await unLikePost(postId);
          request = {
            ...request,
            heading: t(LocalizedStrings.community.post.unliked_post),
            context: t("community.post.user_unliked_post", { user: user?.firstName }),
          };
        } else {
          await likePost(postId);
        }
        await sendNotification(request);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [likePost, unLikePost, sendNotification, user?.id, user?.firstName, t],
  );

  const handleApiComment = useCallback(
    async (postId: string) => {
      try {
        await fetchPostComments(postId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [fetchPostComments, t],
  );

  const renderSection = useCallback(
    ({ item }: { item: GroupResponse | CommunityPost }) => {
      switch (activeSegment) {
        case "groups":
          return <GroupCard item={item as GroupResponse} />;
        case "posts":
        case "saved":
          return (
            <PostCard
              post={item as CommunityPost}
              onApiShare={handleApiShare}
              onApiLike={(postId, isLiked) => handleLike(postId, isLiked, item?.user?.id)}
              onApiComment={handleApiComment}
              onAuthorPress={(authorId) =>
                router.push({
                  pathname: "/profile/public-profile",
                  params: {
                    userId: authorId,
                  },
                })
              }
            />
          );
      }
    },
    [activeSegment, handleApiShare],
  );

  const loadData = useCallback(async () => {
    try {
      if (activeSegment === "posts") await fetchUserPosts();
      else if (activeSegment === "groups") await fetchUserGroups();
      else if (activeSegment === "saved") await fetchBookmarkedPosts();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [activeSegment, fetchUserPosts, fetchUserGroups, fetchBookmarkedPosts, t]);

  const currentData = useMemo(() => {
    if (activeSegment === "posts") return userPosts.slice(0, 5);
    if (activeSegment === "groups") return userGroups.slice(0, 5);
    return bookmarkedPost.slice(0, 5);
  }, [activeSegment, bookmarkedPost, userGroups, userPosts]);

  const showViewButton = useMemo(() => {
    switch (activeSegment) {
      case "posts":
        return userPosts.length > 5;
      case "groups":
        return userGroups.length > 5;
      case "saved":
        return bookmarkedPost.length > 5;
    }
  }, [userGroups, userPosts, bookmarkedPost, activeSegment]);

  const handleViewAllAction = useCallback(() => {
    switch (activeSegment) {
      case "posts":
        router.push("/profile/post-list");
        break;
      case "groups":
        router.push("/groups/my-groups");
        break;
      case "saved":
        router.push("/(screens)/bookmarked");
        break;
    }
  }, [activeSegment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaScreen>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(80) }}
      >
        {/* Header Section */}
        <View>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <View style={styles.backButtonInner}>
              <IconBackArrow />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRow}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t(LocalizedStrings.settings.profile.title)}
          </ThemeText>
          <TouchableOpacity
            style={styles.rightIcons}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <IconSettings />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.headerWrapper}>
          <View style={styles.avatarWrapper}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarUrl} />
            ) : (
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            )}
          </View>
          <View style={styles.nameOuterWrapper}>
            <View style={styles.nameWrapper}>
              <Text style={styles.name}>{displayName}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push("/profile/edit-profile")}
              >
                <Text style={styles.editButtonText}>{t(LocalizedStrings.common.edit)}</Text>
              </TouchableOpacity>
            </View>
            {user?.bio && (
              <View style={{ flexDirection: "row", marginTop: verticalScale(10) }}>
                <View style={styles.editButton}>
                  <Text style={styles.editButtonText}>{user?.bio}</Text>
                </View>
              </View>
            )}
            <View style={styles.followWrapper}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/profile/follow", params: { type: "Following" } })
                }
                style={styles.followInnerWrapper}
              >
                <Text style={styles.followCount}>{stats?.followingCount || 0}</Text>
                <Text style={styles.followText}>{t(LocalizedStrings.follow.following)}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/profile/follow", params: { type: "Followers" } })
                }
                style={styles.followInnerWrapper}
              >
                <Text style={styles.followCount}>{stats?.followersCount || 0}</Text>
                <Text style={styles.followText}>{t(LocalizedStrings.follow.followers)}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Contact & Location */}
        <View style={styles.infoSection}>
          <IconMail />
          <Text style={styles.infoSectionText}>{user?.email}</Text>
        </View>
        <View style={styles.infoSection}>
          <IconLocation />
          <Text style={styles.infoSectionText}>{countryName}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.addInfoSectionText}>
          <ActionRow
            icon={<IconAdd />}
            label={t(LocalizedStrings.profile.action_menu.add_new)}
            onPress={() => setSearchVisible(true)}
            styles={styles}
          />
          <ActionRow
            icon={<IconProduct color={theme.colors.icon} />}
            label={t(LocalizedStrings.product.myProducts)}
            onPress={() => router.push("/profile/product-list")}
            styles={styles}
          />
          <ActionRow
            icon={<IconLogs />}
            label={t(LocalizedStrings.profile.action_menu.my_schedule_logs)}
            onPress={() => router.push("/profile/logs")}
            styles={styles}
          />
        </View>

        {/* Tabs & List */}
        <View style={styles.tabView}>
          <Tabs
            backgroundColor={theme.colors.background.elevated}
            segments={[
              {
                icon: <IconGrid size={moderateScale(14)} />,
                label: t(LocalizedStrings.profile.filter.posts),
                key: "posts",
              },
              {
                icon: <IconCapture size={moderateScale(14)} />,
                label: t(LocalizedStrings.profile.filter.groups),
                key: "groups",
              },
              {
                icon: <IconBookmarked size={moderateScale(14)} />,
                label: t(LocalizedStrings.profile.filter.saved),
                key: "saved",
              },
            ]}
            onSelect={(e) => setActiveSegment(e as any)}
          />

          <FlatList
            data={currentData}
            renderItem={renderSection}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={<EmptyView message={t(LocalizedStrings.profile.no_data_found)} />}
            scrollEnabled={false}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            contentContainerStyle={{ gap: verticalScale(activeSegment === "groups" ? 15 : 0) }}
          />

          {showViewButton && (
            <Button
              size="small"
              title={t(LocalizedStrings.profile.view_all)}
              variant="outline"
              style={styles.viewButton}
              textStyle={{ color: theme.colors.text.primary }}
              onPress={handleViewAllAction}
            />
          )}
        </View>
      </ScrollView>
      <ScheduleModals
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        showAddButton={false}
      />
    </SafeAreaScreen>
  );
}

// Helper component for cleaner code
const ActionRow = ({ icon, label, onPress, styles }: any) => (
  <TouchableOpacity style={styles.addInfoSectionAction} onPress={onPress}>
    <View style={styles.addInfoIcon}>{icon}</View>
    <Text style={styles.addInfoText}>{label}</Text>
  </TouchableOpacity>
);

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
    avatarWrapper: {
      aspectRatio: 1,
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(10),
    },
    avatarUrl: {
      objectFit: "cover",
      borderRadius: 999,
      aspectRatio: 1,
      height: verticalScale(60),
    },
    avatarInitial: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
    },
    headerWrapper: {
      flexDirection: "row",
      gap: scale(15),
      marginTop: verticalScale(20),
    },
    nameWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flex: 1,
    },
    nameOuterWrapper: {
      flex: 1,
    },
    name: {
      fontSize: moderateScale(18),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
      flexShrink: 1,
    },
    editButtonText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    editButton: {
      backgroundColor: theme.colors.primary.main,
      paddingVertical: verticalScale(2),
      paddingHorizontal: scale(12),
    },
    followWrapper: { flexDirection: "row", gap: scale(15), flex: 1, marginTop: verticalScale(10) },
    followInnerWrapper: { flexDirection: "row", gap: scale(5) },
    followCount: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    followText: {
      color: theme.colors.primary.dark,
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    infoSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      marginTop: verticalScale(15),
      padding: verticalScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
    },
    infoSectionIcon: {
      aspectRatio: 1,
      height: verticalScale(20),
    },
    infoSectionText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      flexShrink: 1,
    },
    addInfoSectionText: {
      gap: verticalScale(20),
      marginTop: verticalScale(15),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(14),
    },
    addInfoSectionAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      borderRadius: moderateScale(10),
      flex: 1,
    },
    addInfoIcon: {
      aspectRatio: 1,
      height: verticalScale(24),
      borderRadius: moderateScale(5),
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    addInfoText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(16),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    tabView: {
      marginTop: verticalScale(40),
    },
    viewButton: {
      borderColor: theme.colors.slateCharcoal,
      alignSelf: "center",
      width: scale(154),
      marginTop: verticalScale(10),
    },
  });
