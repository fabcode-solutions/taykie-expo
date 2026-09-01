import React, { useCallback, useState } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { PickerItem, ScrollPicker } from "../shared/picker/ScrollPicker";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTranslation } from "react-i18next";

// 1. Store the keys in the items array
const genderItems: PickerItem<string>[] = [
  { value: "Male", label: "profile.gender.male", key: "Male" },
  { value: "Female", label: "profile.gender.female", key: "female" },
  { value: "Non-Binary/Other", label: "profile.gender.other", key: "Non-Binary/Other" },
  { value: "Rather Not Say", label: "profile.gender.rather", key: "Rather Not Say" },
];

const ChooseGender = ({
  selected,
  isVisible,
  onClose,
  onSave,
}: {
  selected?: string;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (label: string) => void;
}) => {
  const { t } = useTranslation();

  const initialItem = genderItems.find((i) => i.value === selected) || genderItems[0];
  const [selectedValue, setSelectedValue] = useState<string>(initialItem.value);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const translatedItems = genderItems.map((item) => ({
    ...item,
    label: t(item.label),
  }));

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.profile.gender.title)}
      height="50%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <ScrollPicker
        items={translatedItems}
        selectedValue={selectedValue}
        onValueChange={(value) => {
          setSelectedValue(value);
        }}
        itemHeight={verticalScale(60)}
      />
      <View style={{ padding: verticalScale(20), width: "100%" }}>
        <Button
          title={t(LocalizedStrings.common.save)}
          onPress={() => {
            onSave?.(selectedValue);
            handleClose();
          }}
          textStyle={{ fontSize: moderateScale(20) }}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default ChooseGender;
