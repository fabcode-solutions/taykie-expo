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
  const flatListRef = useRef<FlatList<PickerItem<T>>>(null);
  const [currentSelectedValue, setCurrentSelectedValue] = useState<T | undefined>(selectedValue);

  // Starting row — computed ONCE from the value the picker opened with. It used to
  // depend on the current selection, so every time the wheel settled on a new value
  // the "scroll to initial index" effect re-ran and hard-jumped the list 150ms after
  // the user stopped scrolling (the stutter/snap-back when picking an option).
  const [initialScrollIndex] = useState(() => {
    if (selectedValue === undefined || selectedValue === null) return 0;
    const index = items.findIndex((item) => item.value === selectedValue);
    return index !== -1 ? index : 0;
  });
  // Start the scale/opacity animation at the opening row, so the first frame is right
  // instead of animating in from row 0.
  const scrollY = useSharedValue(initialScrollIndex * itemHeight);

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

  // Scroll handler with selection update. onEndDrag too, not only onMomentumEnd: a
  // slow drag-and-release has no momentum phase (common on Android), so the selection
  // never updated. The snap target is the nearest row either way.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onEndDrag: (event) => {
      runOnJS(updateSelection)(event.contentOffset.y);
    },
    onMomentumEnd: (event) => {
      runOnJS(updateSelection)(event.contentOffset.y);
    },
  });

  // Fallback for the rare case initialScrollIndex didn't apply (list not laid out
  // yet) — runs once on mount, never again on selection changes.
  useEffect(() => {
    if (initialScrollIndex === 0 || items.length === 0) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: initialScrollIndex * itemHeight,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default item renderer
  const defaultRenderItem = useCallback(
    (item: PickerItem<T>, _isSelected: boolean) => (
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
        isSelected={item.value === currentSelectedValue}
        scrollY={scrollY}
        itemHeight={itemHeight}
        renderContent={renderItem || defaultRenderItem}
        minScale={minScale}
        minOpacity={minOpacity}
      />
    ),
    [
      scrollY,
      itemHeight,
      renderItem,
      defaultRenderItem,
      minScale,
      minOpacity,
      currentSelectedValue,
    ],
  );

  const keyExtractor = useCallback((item: PickerItem<T>) => item.key, []);
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: itemHeight, offset: itemHeight * index, index }),
    [itemHeight],
  );
  const listContentStyle = useMemo(
    () => ({ paddingVertical: verticalScale(itemHeight * 2) }),
    [itemHeight],
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
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={listContentStyle}
        getItemLayout={getItemLayout}
        // Short lists: render every row up front so nothing pops in while flicking.
        initialNumToRender={Math.max(10, initialScrollIndex + 6)}
        windowSize={11}
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
  isSelected: boolean;
  scrollY: Animated.SharedValue<number>;
  itemHeight: number;
  renderContent: (item: PickerItem<T>, isSelected: boolean) => React.ReactNode;
  minScale: number;
  minOpacity: number;
}

const PickerItemComponent = <T extends any>({
  item,
  index,
  isSelected,
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
