import React, { useCallback, useState, useEffect } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { ScrollPicker } from "../shared/picker/ScrollPicker";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTranslation } from "react-i18next";
import { COUNTRIES } from "@/app/(onboarding)/country-language";

const countryItems = COUNTRIES.map((c) => ({
  label: c.name,
  value: c.code,
}));

const ChooseCountry = ({
  selected,
  isVisible,
  onClose,
  onSave,
}: {
  selected?: string;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (code: string) => void;
}) => {
  const { t } = useTranslation();

  const initialItem = countryItems.find((i) => i.value === selected) ?? countryItems[0];
  const [selectedValue, setSelectedValue] = useState<string>(initialItem.value);

  // Sync when selected prop changes (e.g. modal reopens with existing value)
  useEffect(() => {
    const match = countryItems.find((i) => i.value === selected);
    if (match) setSelectedValue(match.value);
  }, [selected]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.profile.country)}
      height="50%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <ScrollPicker
        items={countryItems}
        selectedValue={selectedValue}
        onValueChange={(value) => setSelectedValue(value)}
        itemHeight={verticalScale(60)}
      />
      <View style={{ padding: verticalScale(20), width: "100%" }}>
        <Button
          title={t(LocalizedStrings.common.save)}
          onPress={() => {
            onSave?.(selectedValue); // returns country code
            handleClose();
          }}
          textStyle={{ fontSize: moderateScale(20) }}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default ChooseCountry;
