import React, { useState, useCallback, memo, useMemo, useRef } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from "react-native";
import { computeDropdownPosition } from "@/utils/ui/dropdown";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeText, ThemeView } from "@/components";
import { useColors, useSpacing } from "@/theme/hooks";
import { truncateWords } from "@/utils/formatter";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

type FilterOption = { label: string; value: string };

// Memoized FilterOption component for better performance
const FilterOptionItem = memo<{
  option: FilterOption;
  isSelected: boolean;
  onPress: (value: string) => void;
  spacing: any;
}>(({ option, isSelected, onPress, spacing }) => {
  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [onPress, option.value]);

  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ paddingVertical: verticalScale(10), paddingHorizontal: spacing.sm }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: scale(12),
        }}
      >
        <ThemeText
          variant="manrope.body2"
          color={isSelected ? colors.text.primary : colors.text.secondary}
          style={{ flex: 1 }}
        >
          {option.label}
        </ThemeText>
        {isSelected && (
          <MaterialIcons name="check" size={moderateScale(16)} color={colors.text.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
});

FilterOptionItem.displayName = "FilterOptionItem";

// Memoized Dropdown Arrows component
const DropdownArrows = memo<{ color: string }>(({ color }) => (
  <View
    style={{
      flexDirection: "column",
      alignContent: "center",
      gap: 0,
      justifyContent: "center",
    }}
  >
    <MaterialIcons
      style={{ marginBottom: -verticalScale(4) }}
      name="keyboard-arrow-up"
      size={moderateScale(16)}
      color={color}
    />
    <MaterialIcons
      style={{ marginTop: -verticalScale(4) }}
      name="keyboard-arrow-down"
      size={moderateScale(16)}
      color={color}
    />
  </View>
));

DropdownArrows.displayName = "DropdownArrows";

type FilterProps = {
  label: string;
  options: FilterOption[];
  selected: string; // selected value (matches option.value)
  onSelect: (value: string) => void;
  style?: ViewStyle | ViewStyle[];
};

const Filter: React.FC<FilterProps> = memo(({ label, options, selected, onSelect, style }) => {
  const colors = useColors();
  const spacing = useSpacing();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View | null>(null);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const openDropdown = useCallback(() => {
    requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow?.((x, y, width, height) => {
        setAnchor({ x, y, width, height });
        setOpen(true);
      });
    });
  }, []);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    // Clear anchor on next frame to avoid stale positioning flashes on iOS
    requestAnimationFrame(() => setAnchor(null));
  }, []);

  const toggleDropdown = useCallback(() => {
    if (open) closeDropdown();
    else openDropdown();
  }, [open, openDropdown, closeDropdown]);

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      setOpen(false);
    },
    [onSelect],
  );

  // Derive the display label from the selected value
  const selectedLabel = useMemo(() => {
    const match = options?.find((o) => o.value === selected);
    return match?.label ?? selected;
  }, [options, selected]);
  // Memoize the truncated selected text for the button
  const selectedText = useMemo(() => truncateWords(selectedLabel, 2), [selectedLabel]);

  // Memoize dropdown styles
  const dropdownStyles = useMemo(
    () => [
      styles.filterDropdown,
      {
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.background.elevated,
      },
    ],
    [colors.border, colors.background.elevated, spacing.sm],
  );
  const sheetStyles = useMemo(
    () => ({
      backgroundColor: colors.background.paper,
      borderWidth: scale(1),
      borderColor: colors.border,
      borderRadius: moderateScale(8),
      maxHeight: verticalScale(360),
      overflow: "hidden" as const,
    }),
    [colors.background.paper, colors.border],
  );

  return (
    <View style={[{ position: "relative" }, style]} ref={triggerRef}>
      {/* Button */}
      <TouchableOpacity activeOpacity={0.7} onPress={toggleDropdown}>
        <ThemeView style={dropdownStyles}>
          <ThemeText numberOfLines={1} ellipsizeMode="tail" variant="manrope.body2">
            {selectedText}
          </ThemeText>
          <DropdownArrows color={colors.text.secondary} />
        </ThemeView>
      </TouchableOpacity>

      {/* Modal with scrollable options */}
      {open && (
        <Modal
          transparent
          visible={open && !!anchor}
          animationType={Platform.OS === "ios" ? "none" : "fade"}
          onRequestClose={closeDropdown}
          onDismiss={() => setAnchor(null)}
        >
          <TouchableWithoutFeedback onPress={closeDropdown}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.06)" }}>
              <TouchableWithoutFeedback>
                {anchor &&
                  (() => {
                    const pos = computeDropdownPosition(anchor, options?.length ?? 0);
                    return (
                      <View
                        style={{
                          position: "absolute",
                          top: pos.top,
                          left: pos.left,
                          width: pos.width,
                        }}
                      >
                        <View style={sheetStyles}>
                          <ScrollView>
                            {options.map((opt) => (
                              <FilterOptionItem
                                key={opt.value}
                                option={opt}
                                isSelected={opt.value === selected}
                                onPress={handleSelect}
                                spacing={spacing}
                              />
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    );
                  })()}
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
});

Filter.displayName = "Filter";

const styles = StyleSheet.create({
  filterDropdown: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 0,
    justifyContent: "space-between",
    borderWidth: scale(1),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(4),
    minWidth: scale(120),
  },
});

export default Filter;
