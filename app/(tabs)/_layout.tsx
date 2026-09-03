import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import IconHome from "@/components/icons/tabs/IconHome";
import IconCalander from "@/components/icons/tabs/IconCalander";
import IconCommunity from "@/components/icons/tabs/IconCommunity";
import IconDevice from "@/components/icons/tabs/IconDevice";
import IconInsight from "@/components/icons/tabs/IconInsight";
import IconSettings from "@/components/icons/tabs/IconSettings";
import { moderateScale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  const bg = theme.colors.tab.background;
  const activeColor = theme.colors.tab.text.primary;
  const inactiveColor = theme.colors.tab.text.secondary;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarItemStyle: {
          paddingVertical: verticalScale(Platform.OS === "ios" ? 6 : 8),
        },

        tabBarIconStyle: {
          marginBottom: verticalScale(Platform.OS === "ios" ? -2 : 0),
        },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: verticalScale(Platform.OS === "ios" ? 64 : 80),
          borderRadius: moderateScale(20),
          backgroundColor: bg,
          borderTopWidth: 0,
          overflow: "hidden",
          paddingBottom: verticalScale(Platform.OS === "ios" ? 10 : 0),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t(LocalizedStrings.navigation.tabs.dashboard),

          tabBarIcon: ({ color }) => <IconHome stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t(LocalizedStrings.navigation.tabs.schedule),
          tabBarIcon: ({ color }) => <IconCalander stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t(LocalizedStrings.navigation.tabs.community),
          tabBarIcon: ({ color }) => <IconCommunity stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="device"
        options={{
          title: t(LocalizedStrings.navigation.tabs.device),
          tabBarIcon: ({ color }) => <IconDevice stroke={color} />,
        }}
      />

      <Tabs.Screen
        name="insights"
        options={{
          title: t(LocalizedStrings.navigation.tabs.insights),
          tabBarIcon: ({ color }) => <IconInsight stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t(LocalizedStrings.navigation.tabs.settings),
          tabBarIcon: ({ color }) => <IconSettings stroke={color} />,
        }}
      />
    </Tabs>
  );
}
