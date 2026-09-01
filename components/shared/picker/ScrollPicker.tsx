import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet as RNStyleSheet, FlatList, ListRenderItem } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  runOnJS,
} from "react-native-reanimated";
import { ThemeView, ThemeText } from "@/components/primitives";
import { useTheme } from "@/theme";
import { moderateScale, verticalScale } from "@/utils/scale";

const DEFAULT_ITEM_HEIGHT = 60;

export interface PickerItem<T = any> {
  value: T;
  label: string;
  key: string;
}

interface ScrollPickerProps<T = any> {
  items: PickerItem<T>[];
  selectedValue?: T;
  onValueChange?: (value: T, item: PickerItem<T>) => void;
  itemHeight?: number;
  renderItem?: (item: PickerItem<T>, isSelected: boolean) => React.ReactNode;
  showIndicatorLines?: boolean;
  minScale?: number;
  minOpacity?: number;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<PickerItem>);

export const ScrollPicker = <T extends any>({
  items,
  selectedValue,
  onValueChange,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  renderItem,
  showIndicatorLines = true,
  minScale = 0.8,
  minOpacity = 0.3,
}: ScrollPickerProps<T>) => {
  const theme = useTheme();
  const scrollY = useSharedValue(0);
  const flatListRef = useRef<FlatList<PickerItem<T>>>(null);
  const [currentSelectedValue, setCurrentSelectedValue] = useState<T | undefined>(selectedValue);

  // Calculate initial scroll position
  const initialScrollIndex = useMemo(() => {
    if (!currentSelectedValue) return 0;
    const index = items.findIndex((item) => item.value === currentSelectedValue);
    return index !== -1 ? index : 0;
  }, [items, currentSelectedValue]);

  // Calculate selected item based on scroll position
  const calculateSelectedItem = useCallback(
    (scrollPosition: number) => {
      const index = Math.round(scrollPosition / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      return items[clampedIndex];
    },
    [items, itemHeight],
  );

  // Update selection on scroll
  const updateSelection = useCallback(
    (scrollPosition: number) => {
      const selectedItem = calculateSelectedItem(scrollPosition);
      if (selectedItem && selectedItem.value !== currentSelectedValue) {
        setCurrentSelectedValue(selectedItem.value);
        onValueChange?.(selectedItem.value, selectedItem);
      }
    },
    [calculateSelectedItem, currentSelectedValue, onValueChange],
  );

  // Scroll handler with selection update
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onMomentumEnd: (event) => {
      runOnJS(updateSelection)(event.contentOffset.y);
    },
  });

  // Scroll to initial position on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (flatListRef.current && items.length > 0) {
        flatListRef.current.scrollToIndex({
          index: initialScrollIndex,
          animated: false,
        });
        scrollY.value = initialScrollIndex * itemHeight;
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [initialScrollIndex, items.length, itemHeight, scrollY]);

  // Default item renderer
  const defaultRenderItem = useCallback(
    (item: PickerItem<T>, isSelected: boolean) => (
      <ThemeText
        variant="manrope.h3"
        style={[
          pickerStyles.defaultItemText,
          {
            borderColor: "#E6E6E6",
            color: theme.colors.text.primary,
          },
        ]}
      >
        {item.label}
      </ThemeText>
    ),
    [theme.colors.text.primary],
  );

  // Render individual picker item
  const renderPickerItem = useCallback<ListRenderItem<PickerItem<T>>>(
    ({ item, index }) => (
      <PickerItemComponent
        item={item}
        index={index}
        scrollY={scrollY}
        itemHeight={itemHeight}
        renderContent={renderItem || defaultRenderItem}
        minScale={minScale}
        minOpacity={minOpacity}
      />
    ),
    [scrollY, itemHeight, renderItem, defaultRenderItem, minScale, minOpacity],
  );

  return (
    <ThemeView style={pickerStyles.pickerContainer}>
      {/* Selection indicator line (top) */}
      {showIndicatorLines && (
        <View
          style={[
            pickerStyles.selectionLine,
            { top: verticalScale(itemHeight * 2), backgroundColor: theme.colors.divider },
          ]}
        />
      )}

      {/* Scrollable list */}
      <AnimatedFlatList
        ref={flatListRef}
        data={items}
        renderItem={renderPickerItem}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: verticalScale(itemHeight * 2),
        }}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        initialScrollIndex={initialScrollIndex}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 100);
        }}
      />

      {/* Selection indcator line (bottom) */}
      {showIndicatorLines && (
        <View
          style={[
            pickerStyles.selectionLine,
            { top: verticalScale(itemHeight * 3), backgroundColor: theme.colors.divider },
          ]}
        />
      )}
    </ThemeView>
  );
};

// Individual picker item component with animation
interface PickerItemComponentProps<T> {
  item: PickerItem<T>;
  index: number;
  scrollY: Animated.SharedValue<number>;
  itemHeight: number;
  renderContent: (item: PickerItem<T>, isSelected: boolean) => React.ReactNode;
  minScale: number;
  minOpacity: number;
}

const PickerItemComponent = <T extends any>({
  item,
  index,
  scrollY,
  itemHeight,
  renderContent,
  minScale,
  minOpacity,
}: PickerItemComponentProps<T>) => {
  const animatedStyle = useAnimatedStyle(() => {
    const itemOffset = index * itemHeight;
    const inputRange = [
      itemOffset - itemHeight * 2,
      itemOffset - itemHeight,
      itemOffset,
      itemOffset + itemHeight,
      itemOffset + itemHeight * 2,
    ];

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [minScale, (1 + minScale) / 2, 1, (1 + minScale) / 2, minScale],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [minOpacity, (1 + minOpacity) / 2, 1, (1 + minOpacity) / 2, minOpacity],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const isSelected = Math.abs(scrollY.value - index * itemHeight) < itemHeight / 2;

  return (
    <Animated.View style={[{ height: itemHeight }, pickerStyles.itemContainer, animatedStyle]}>
      {renderContent(item, isSelected)}
    </Animated.View>
  );
};

const pickerStyles = RNStyleSheet.create({
  pickerContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  defaultItemText: {
    textAlign: "center",
    fontSize: moderateScale(20),
    fontWeight: "500" as const,
  },
  selectionLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: verticalScale(1),
    zIndex: 10,
  },
});
