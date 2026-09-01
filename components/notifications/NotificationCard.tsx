import { fontFamily, Theme, useTheme } from "@/theme";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import IconNotifications from "../icons/settings/IconNotifications";
import IconPill from "../icons/IconPill";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { NotificationData } from "@/stores/notificationStore";
import { formatDate } from "@/utils/formatter";
import IconComment from "../icons/IconComment";
import IconHeart from "../icons/IconHeart";

export interface NotificationProps {
  type: "Reminders" | "Updates" | "System" | "All";
  heading: string;
  content: string;
  time: string;
  read: boolean;
  subHeading: string;
}

const NotificationCard = ({
  item,
  onPress,
}: { item: NotificationData } & { onPress?: () => void }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable style={styles.notiWrapper} onPress={() => onPress?.()}>
      <View style={styles.iconWrapper}>
        {item.type === "Follow" && <IconPill />}
        {item.type === "Comment" && <IconComment />}
        {item.type === "Like" && <IconHeart />}
        {item.type === "System" && <IconNotifications />}
        {!item.isRead && <View style={styles.dot}></View>}
      </View>
      <View>
        <Text style={styles.subHeading}>{item.type}</Text>
        <Text style={styles.heading}>{item.title}</Text>
        <Text style={styles.content}>{item.message}</Text>
        <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
};

export default NotificationCard;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    notiWrapper: {
      borderRadius: moderateScale(12),
      backgroundColor: theme.colors.white,
      padding: verticalScale(16),
      paddingBottom: verticalScale(32),
      flexDirection: "row",
      gap: scale(16),
      boxShadow: "0px 2px 12px rgba(0, 0, 0, 0.01)",
      elevation: 12,
      ...theme.shadows[2],
    },
    dot: {
      backgroundColor: theme.colors.taupe,
      aspectRatio: 1,
      height: verticalScale(6),
      borderRadius: 999,
      position: "absolute",
      top: verticalScale(4),
      right: scale(4),
    },
    iconWrapper: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: 999,
      backgroundColor: theme.colors.background.default,
      justifyContent: "center",
      alignItems: "center",
    },
    subHeading: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.text.primary,
    },
    heading: {
      fontSize: moderateScale(16),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
      marginVertical: verticalScale(5),
    },
    content: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.text.primary,
      maxWidth: "95%",
    },
    time: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
    },
  });
