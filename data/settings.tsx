import IconAccountCenter from "@/components/icons/settings/IconAccountCenter";
import IconForward from "@/components/icons/settings/IconForward";
import IconIntegrations from "@/components/icons/settings/IconIntegrations";
import IconLock from "@/components/icons/settings/IconLock";
import IconLogout from "@/components/icons/settings/IconLogout";
import IconNotifications from "@/components/icons/settings/IconNotifications";
import IconSheild from "@/components/icons/settings/IconSheild";
import IconSpeaker from "@/components/icons/settings/IconSpeaker";
import { ReactElement } from "react";
export interface SettingItem {
  leftIcon: ReactElement | null;
  heading: string;
  action: string;
  description?: string;
  rightIcon: ReactElement | null;
}
export type RoutePath = `/${string}` | "" | undefined;
export type SettingsMap = Record<string, SettingItem[]>;

export const SETTINGS: SettingsMap = {
  profile: [
    {
      leftIcon: <IconAccountCenter />,
      heading: "settings.profile.account_center.title",
      action: "/profile/profile",
      description: "settings.profile.account_center.description",
      rightIcon: <IconForward />,
    },
  ],
  notifications: [
    {
      leftIcon: <IconNotifications />,
      heading: "settings.notificationSettings.title",
      action: "/settings/notification-settings",
      description: "settings.notificationSettings.description",
      rightIcon: <IconForward />,
    },
    {
      leftIcon: <IconSpeaker />,
      heading: "settings.reminderSettings.title",
      action: "/settings/reminder-preferences",
      description: "settings.reminderSettings.description",
      rightIcon: <IconForward />,
    },
  ],
  integrations: [
    {
      leftIcon: <IconIntegrations />,
      heading: "settings.integrations.title",
      action: "/settings/integrations",
      description: "settings.integrations.description2",
      rightIcon: <IconForward />,
    },
  ],
  dataPrivacy: [
    {
      leftIcon: <IconLock />,
      heading: "settings.dataPrivacy.privacySecurity",
      action: "/settings/data-privacy",
      description: "settings.dataPrivacy.security_description",
      rightIcon: <IconForward />,
    },
  ],
  helpSupport: [
    {
      leftIcon: <IconSheild />,
      heading: "settings.helpSupport.title",
      action: "/settings/help-support",
      description: "settings.helpSupport.description",
      rightIcon: <IconForward />,
    },
  ],
  logout: [
    {
      leftIcon: <IconLogout />,
      heading: "settings.logout.title",
      action: "logout",
      rightIcon: <IconForward />,
    },
  ],
};
