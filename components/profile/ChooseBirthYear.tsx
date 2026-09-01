import React, { useCallback, useState } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { PickerItem, ScrollPicker } from "../shared/picker/ScrollPicker";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

const yearItems: PickerItem<number>[] = Array.from({ length: 150 }, (_, i) => {
  const year = 2025 - i;
  return {
    value: i + 1,
    label: `${year}`,
    key: `${year}`,
  };
});

const ChooseBirthYear = ({
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
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  const [selectedMonth, setSelectedMonth] = useState<string>(selected ?? yearItems[0].label);
  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.profile.choose_birthYear)}
      height="50%"
      showHandle
      closeOnSwipeDown // Only works on handle now
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <ScrollPicker
        items={yearItems}
        selectedValue={parseInt(selectedMonth)}
        onValueChange={(value, item) => {
          setSelectedMonth(item.label);
          console.log("Selected month:", value);
        }}
        itemHeight={60}
      />
      <View style={{ padding: verticalScale(20), width: "100%" }}>
        <Button
          title={t(LocalizedStrings.common.save)}
          onPress={() => {
            onSave?.(selectedMonth);
            handleClose();
          }}
          textStyle={{ fontSize: moderateScale(20) }}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default ChooseBirthYear;
