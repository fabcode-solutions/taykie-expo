import React, { useCallback } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import SettingsSubScreen from "@/components/settings/SettingsSubScreen";
import DeviceRegistrationForm from "@/components/device/DeviceRegistrationForm";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

/** Settings → Register your Taykie: the same flow as onboarding, or the registered summary. */
export default function DeviceRegistrationSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const handleDone = useCallback(() => router.back(), [router]);

  return (
    <SettingsSubScreen title={t(LocalizedStrings.deviceRegistration.title)}>
      <DeviceRegistrationForm mode="settings" onDone={handleDone} />
    </SettingsSubScreen>
  );
}
