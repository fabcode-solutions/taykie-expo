import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { PickerItem, ScrollPicker } from "../shared/picker/ScrollPicker";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
const monthItems: PickerItem<number>[] = [
  { value: 1, label: "Default app sound", key: "default" },
  { value: 2, label: "Silent", key: "silent" },
];

// Move these outside or keep them as constants
const soundToValueMap: Record<string, number> = {
  default: 1,
  silent: 2,
};

const valueToSoundMap: Record<number, string> = {
  1: "default",
  2: "silent",
};

const NotificationBottomDrawer = ({
  selected,
  isVisible,
  onClose,
  onSave,
}: {
  selected?: string;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (soundName: string) => void;
}) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 1. Localize the items inside the component to ensure 't' is available
  const monthItems: PickerItem<number>[] = useMemo(
    () => [
      {
        value: 1,
        label: t(LocalizedStrings.settings.notificationSettings.notificationSound.default),
        key: "default",
      },
      {
        value: 2,
        label: t(LocalizedStrings.settings.notificationSettings.notificationSound.silent),
        key: "silent",
      },
    ],
    [],
  );

  const [selectedMonth, setSelectedMonth] = useState<number>(
    soundToValueMap[selected ?? "default"] ?? 1,
  );

  // Sync state if 'selected' prop changes while drawer is closed/reopened
  useEffect(() => {
    if (isVisible) {
      setSelectedMonth(soundToValueMap[selected ?? "default"] ?? 1);
    }
  }, [isVisible, selected]);

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.settings.notificationSettings.notificationSound.title)}
      height="50%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <ScrollPicker
        items={monthItems}
        selectedValue={selectedMonth}
        onValueChange={(value) => {
          setSelectedMonth(value);
        }}
        itemHeight={verticalScale(60)}
      />
      <View style={{ padding: verticalScale(20), width: "100%" }}>
        <Button
          title={t(LocalizedStrings.profile.save_changes)}
          onPress={() => {
            // 2. Map the numeric value back to the string the backend expects
            const sound = valueToSoundMap[selectedMonth];
            if (sound) {
              onSave?.(sound); // Sends "default" or "silent"
            }
          }}
          textStyle={{ fontSize: moderateScale(20) }}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default NotificationBottomDrawer;
