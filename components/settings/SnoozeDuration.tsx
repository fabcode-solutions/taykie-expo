import React, { useCallback, useEffect, useState } from "react";
import { BottomDrawer } from "../BottomDrawer";
import { PickerItem, ScrollPicker } from "../shared/picker/ScrollPicker";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/scale";
const monthItems: PickerItem<number>[] = Array.from({ length: 12 }, (_, i) => {
  const minutes = (i + 1) * 5;
  return {
    value: i + 1,
    label: `${minutes} min`,
    key: `${minutes} min`,
  };
});

const SnoozeDuration = ({
  selected, // e.g., "15 min"
  isVisible,
  onClose,
  onSave,
}: {
  selected?: string;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (duration: string) => void;
}) => {
  // Helper to find the numeric value (1-12) based on the string label
  const getValueFromLabel = useCallback((label?: string) => {
    const item = monthItems.find((i) => i.label === label);
    return item ? item.value : 3; // Default to 15 min (value 3) if not found
  }, []);

  // 1. Store the VALUE (1-12), not the index
  const [selectedValue, setSelectedValue] = useState<number>(getValueFromLabel(selected));

  // 2. Sync state when the drawer opens or the 'selected' prop changes
  useEffect(() => {
    if (isVisible) {
      setSelectedValue(getValueFromLabel(selected));
    }
  }, [isVisible, selected, getValueFromLabel]);

  return (
    <BottomDrawer
      isVisible={isVisible}
      onClose={onClose}
      title="Snooze Duration"
      height="50%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" }}
    >
      <ScrollPicker
        items={monthItems}
        selectedValue={selectedValue}
        onValueChange={(val) => {
          setSelectedValue(val);
        }}
        itemHeight={verticalScale(60)}
      />
      <View style={{ padding: verticalScale(20), width: "100%" }}>
        <Button
          title={"Save Changes"}
          onPress={() => {
            // Find the label by matching the value
            const selectedItem = monthItems.find((i) => i.value === selectedValue);
            if (selectedItem) {
              onSave?.(selectedItem.label);
            }
          }}
          textStyle={{ fontSize: moderateScale(20) }}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default SnoozeDuration;
