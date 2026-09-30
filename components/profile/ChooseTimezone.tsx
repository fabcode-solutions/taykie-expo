import React, { useCallback, useState, useEffect, useMemo } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { ScrollPicker } from "../shared/picker/ScrollPicker";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTranslation } from "react-i18next";
import { getDeviceTimezone, getTimezoneOptions } from "@/utils/timezone";

const ChooseTimezone = ({
  selected,
  isVisible,
  onClose,
  onSave,
}: {
  selected?: string | null;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (code: string) => void;
}) => {
  const { t } = useTranslation();
  const items = useMemo(() => getTimezoneOptions(getDeviceTimezone(), selected), [selected]);

  const initialItem = items.find((i) => i.value === selected) ?? items[0];
  const [selectedValue, setSelectedValue] = useState<string>(initialItem.value);

  // Sync when selected prop changes (e.g. drawer reopens with existing value)
  useEffect(() => {
    const match = items.find((i) => i.value === selected);
    if (match) setSelectedValue(match.value);
  }, [selected, items]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.onboarding.timezone)}
      height="50%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <ScrollPicker
        items={items}
        selectedValue={selectedValue}
        onValueChange={(value) => setSelectedValue(value)}
        itemHeight={verticalScale(60)}
      />
      <View style={{ padding: verticalScale(20), width: "100%" }}>
        <Button
          title={t(LocalizedStrings.common.save)}
          onPress={() => {
            onSave?.(selectedValue); // returns IANA zone
            handleClose();
          }}
          textStyle={{ fontSize: moderateScale(20) }}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default ChooseTimezone;
