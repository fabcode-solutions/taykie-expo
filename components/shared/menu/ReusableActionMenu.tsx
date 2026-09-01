import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
  ViewStyle,
} from "react-native";
import { useTheme, useDarkMode, type Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { SvgIcon, SvgIconName } from "@/components/SvgIcon";
import Svg, { Path } from "react-native-svg";
import { menuAnimationPresets } from "./menuAnimationPresents";
import { useTranslation } from "react-i18next";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

export interface ActionMenuItem {
  id: string;
  label: string;
  // Optional icon from SvgIcon component or custom component
  icon?: SvgIconName | React.ReactNode;
  // Optional custom icon color
  iconColor?: string;
  // Optional text color (for things like "Delete" in red)
  textColor?: string;
  // Optional handler for this item
  onPress: () => void;
  // Optional for destructive actions
  destructive?: boolean;
  // Optional divider after this item
  dividerAfter?: boolean;
  // Optional checkbox/radio selection
  selected?: boolean;
  // Optional to disable item
  disabled?: boolean;
}

export interface ActionMenuPosition {
  // Targeted anchor position (from TouchableOpacity that triggers the menu)
  x?: number;
  y?: number;
  // Width of the anchor element
  width?: number;
  // Height of the anchor element
  height?: number;
  // If provided, overrides automatic positioning logic
  position?: "top" | "bottom" | "left" | "right" | "center";
  // Optional alignment for the menu
  align?: "start" | "center" | "end";
}

export type AnimationPresetName = keyof typeof menuAnimationPresets;

export interface ActionMenuProps {
  // Visible state
  visible: boolean;
  // Menu items array
  items: ActionMenuItem[];
  // Close handler
  onClose: () => void;
  // Callback fired when the modal is dismissed
  onDismiss?: () => void;
  // Position config
  position?: ActionMenuPosition;
  // Optional title for the menu
  title?: string;
  // Optional custom width
  width?: number | string;
  // Optional custom max height
  maxHeight?: number;
  // Optional animation type
  animationType?: "none" | "fade" | "slide";
  // Optional header component
  headerComponent?: React.ReactNode;
  // Optional footer component
  footerComponent?: React.ReactNode;
  animationDuration?: number;
  animationPreset?: AnimationPresetName; // Typed preset name
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const DEFAULT_MENU_WIDTH = 240;
const DEFAULT_MAX_HEIGHT = 400;
const MENU_PADDING = 8;
const SAFE_AREA_PADDING = 16;

const ReusableActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  items,
  onClose,
  onDismiss,
  position = {},
  title,
  width = DEFAULT_MENU_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
  animationType: _animationType = "none",
  headerComponent,
  footerComponent,
  animationDuration = 300,
  animationPreset = "bouncy",
}) => {
  const theme = useTheme();
  const isDarkMode = useDarkMode();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  // Refs for measuring
  const menuRef = useRef<View>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // State for menu dimensions and positioning
  const [menuDimensions, setMenuDimensions] = useState({
    height: 0,
    width: typeof width === "number" ? width : DEFAULT_MENU_WIDTH,
  });
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  // Update visibility state separately from animation to avoid race conditions
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
    } else {
      // When visible becomes false, start the close animation
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: animationDuration * 0.85,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
        setIsPositioned(false);
      });
    }
  }, [visible, scaleAnim, animationDuration]);

  // Handle animation based on visibility
  useEffect(() => {
    if (visible && isPositioned) {
      // Only animate after we have a position and modal is truly visible
      // A timeout of 0 can help break the synchronous chain of updates
      const timerId = setTimeout(() => {
        scaleAnim.setValue(0); // Reset before animation
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: animationDuration,
          easing: Easing.out(Easing.back(1.1)), // Or your chosen preset easing
          useNativeDriver: true,
        }).start();
      }, 0);
      return () => clearTimeout(timerId);
    }
  }, [visible, isPositioned, scaleAnim, animationDuration, animationPreset]); // Added animationPreset to deps if easing depends on it

  // Reset state when menu closes completely
  useEffect(() => {
    if (!modalVisible && !visible) {
      // Clean up state only after modal is fully hidden
      setMenuPosition({ top: 0, left: 0 });
      setMenuDimensions({
        height: 0,
        width: typeof width === "number" ? width : DEFAULT_MENU_WIDTH,
      });
      setIsScrollable(false);
    }
  }, [modalVisible, visible, width]);

  // Calculate menu position based on measured dimensions
  const calculateMenuPosition = useCallback(
    (menuHeight: number, menuWidth: number) => {
      // Center the menu if no position is provided
      if (!position.x && !position.y) {
        setMenuPosition({
          top: (SCREEN_HEIGHT - menuHeight) / 2,
          left: (SCREEN_WIDTH - menuWidth) / 2,
        });
        setIsPositioned(true);
        return;
      }

      const anchorX = position.x ?? 0;
      const anchorY = position.y ?? 0;
      const anchorWidth = position.width ?? 0;
      const anchorHeight = position.height ?? 0;
      const preferredPosition = position.position ?? "bottom";
      const preferredAlign = position.align ?? "center";

      let top = 0;
      let left = 0;

      // Vertical positioning logic
      if (preferredPosition === "bottom") {
        top = anchorY + anchorHeight;
        if (top + menuHeight + SAFE_AREA_PADDING > SCREEN_HEIGHT) {
          top = anchorY - menuHeight;
        }
      } else if (preferredPosition === "top") {
        top = anchorY - menuHeight;
        if (top < SAFE_AREA_PADDING) {
          top = anchorY + anchorHeight;
        }
      } else if (preferredPosition === "center") {
        top = anchorY + anchorHeight / 2 - menuHeight / 2;
      }

      // Horizontal positioning logic
      if (preferredAlign === "center") {
        left = anchorX + anchorWidth / 2 - menuWidth / 2;
      } else if (preferredAlign === "start") {
        left = anchorX;
      } else if (preferredAlign === "end") {
        left = anchorX + anchorWidth - menuWidth;
      }

      // Adjust horizontal boundaries
      if (left < SAFE_AREA_PADDING) {
        left = SAFE_AREA_PADDING;
      } else if (left + menuWidth + SAFE_AREA_PADDING > SCREEN_WIDTH) {
        left = SCREEN_WIDTH - menuWidth - SAFE_AREA_PADDING;
      }

      // Adjust vertical boundaries
      if (top < SAFE_AREA_PADDING) {
        top = SAFE_AREA_PADDING;
      } else if (top + menuHeight + SAFE_AREA_PADDING > SCREEN_HEIGHT) {
        const shouldScroll = true;
        const availableHeight = SCREEN_HEIGHT - SAFE_AREA_PADDING * 2;

        // Create a new function for this update to avoid state batching issues
        setIsScrollable(shouldScroll);
        setMenuDimensions((prev) => ({ ...prev, height: Math.min(availableHeight, maxHeight) }));
        top = SAFE_AREA_PADDING;
      }

      // Update position state
      setMenuPosition({ top, left });
      setIsPositioned(true);
    },
    [position, maxHeight, setIsPositioned],
  );

  // Handle menu layout measurements
  const onMenuLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;

      // Skip redundant updates if dimensions haven't changed significantly
      const hasHeightChanged = Math.abs(height - menuDimensions.height) > 1;
      const hasWidthChanged = Math.abs(width - menuDimensions.width) > 1;

      if (!isPositioned && visible) {
        // Batch dimension updates together
        const newHeight = height > maxHeight ? maxHeight : height;
        const newWidth = typeof width === "number" ? width : menuDimensions.width;

        // Update dimensions first
        setMenuDimensions({ height: newHeight, width: newWidth });

        // Then calculate position based on these dimensions
        calculateMenuPosition(newHeight, newWidth);

        // Update scrollable state if needed
        if (height > maxHeight) {
          setIsScrollable(true);
        }
      } else if ((hasHeightChanged || hasWidthChanged) && !isPositioned) {
        // Only update dimensions if position hasn't been calculated yet
        const updatedDimensions = {
          height: hasHeightChanged ? height : menuDimensions.height,
          width: hasWidthChanged ? width : menuDimensions.width,
        };
        setMenuDimensions(updatedDimensions);
      }
    },
    [menuDimensions, maxHeight, isPositioned, visible, calculateMenuPosition],
  );

  // Handle close with animation
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Render each menu item
  const renderMenuItem = useCallback(
    (item: ActionMenuItem, index: number) => {
      const textColor = item.destructive
        ? theme.colors.error.main
        : (item.textColor ?? theme.colors.text.primary);

      const iconColor = item.destructive
        ? theme.colors.error.main
        : (item.iconColor ?? theme.colors.text.primary);

      return (
        <React.Fragment key={item.id || index}>
          <TouchableOpacity
            style={[styles.menuItem, item.disabled && styles.disabledItem]}
            onPress={() => {
              if (!item.disabled) {
                item.onPress();
              }
            }}
            activeOpacity={item.disabled ? 1 : 0.7}
            disabled={item.disabled}
          >
            {/* Selected indicator for checkable items */}
            {item.selected && (
              <View style={styles.selectedIndicator}>
                <Svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <Path
                    d="M6.29004 15.4692C5.84733 15.4692 5.47103 15.2783 5.16113 14.8965L0.861328 9.60059C0.739583 9.45671 0.651042 9.31559 0.595703 9.17725C0.545898 9.0389 0.520996 8.89502 0.520996 8.74561C0.520996 8.41357 0.631673 8.13965 0.853027 7.92383C1.07438 7.70801 1.35384 7.6001 1.69141 7.6001C2.07324 7.6001 2.39421 7.76335 2.6543 8.08984L6.25684 12.6553L13.2876 1.51562C13.4315 1.29427 13.5809 1.13932 13.7358 1.05078C13.8908 0.956706 14.0845 0.909668 14.3169 0.909668C14.6545 0.909668 14.9312 1.01481 15.147 1.2251C15.3628 1.43538 15.4707 1.70378 15.4707 2.03027C15.4707 2.16309 15.4486 2.2959 15.4043 2.42871C15.36 2.56152 15.2909 2.69987 15.1968 2.84375L7.42725 14.8633C7.16162 15.2673 6.78255 15.4692 6.29004 15.4692Z"
                    fill={theme.colors.primary.main}
                  />
                </Svg>
              </View>
            )}

            {/* Text part */}
            <ThemeText
              style={[styles.menuText, item.disabled && styles.disabledText]}
              color={textColor}
              variant="manrope.body1"
            >
              {t(item.label)}
            </ThemeText>

            {/* Icon part */}
            {item.icon && (
              <View style={styles.iconContainer}>
                {typeof item.icon === "string" ? (
                  <SvgIcon name={item.icon as SvgIconName} size={24} color={iconColor} />
                ) : (
                  item.icon
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Optional divider */}
          {item.dividerAfter && <View style={[styles.divider]} />}
        </React.Fragment>
      );
    },
    [theme.colors, styles, t],
  );

  // Animation styles
  const animatedStyle = useMemo(() => {
    const initialScale = 0.1;
    let translateX = 0;
    let translateY = 0;

    if (
      position.x !== undefined &&
      position.width !== undefined &&
      position.y !== undefined &&
      position.height !== undefined
    ) {
      // Calculate the anchor point (center of the menu-dots button)
      const anchorCenterX = position.x + position.width / 2;
      const anchorCenterY = position.y + position.height / 2;

      // Calculate the menu's center
      const menuCenterX = menuPosition.left + menuDimensions.width / 2;
      const menuCenterY = menuPosition.top + menuDimensions.height / 2;

      // Calculate the distance between the anchor center and menu center
      const deltaX = anchorCenterX - menuCenterX;
      const deltaY = anchorCenterY - menuCenterY;

      // Scale this distance for animation
      translateX = deltaX * (1 - initialScale);
      translateY = deltaY * (1 - initialScale);
    }

    return {
      opacity: scaleAnim,
      transform: [
        // Apply the translation to make it look like it's growing from the dot
        {
          translateX: scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [translateX, 0],
          }),
        },
        {
          translateY: scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [translateY, 0],
          }),
        },
        // Apply scaling
        {
          scale: scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [initialScale, 1],
          }),
        },
      ],
    };
  }, [scaleAnim, position, menuPosition, menuDimensions]);

  // Don't render anything if modal shouldn't be visible
  if (!visible && !modalVisible) {
    return null;
  }

  // Prepare container style for Animated.View, ensuring width is number or valid percentage string
  const menuContainerDynamicStyle: ViewStyle = {
    top: menuPosition.top,
    left: menuPosition.left,
    width:
      typeof width === "string"
        ? (width as import("react-native").DimensionValue)
        : menuDimensions.width,
    maxHeight: isScrollable ? maxHeight : undefined,
  };

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={handleClose}
      onDismiss={onDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              ref={menuRef}
              style={[styles.menuContainer, menuContainerDynamicStyle, animatedStyle]}
              onLayout={onMenuLayout}
            >
              {/* Optional title */}
              {(title ?? headerComponent) && (
                <View style={styles.menuHeader}>
                  {headerComponent ?? (
                    <ThemeText
                      variant="manrope.subtitle2"
                      style={styles.menuTitle}
                      color={theme.colors.text.secondary}
                    >
                      {t(title ?? "")}
                    </ThemeText>
                  )}
                </View>
              )}

              {/* Menu items */}
              {isScrollable ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {items.map(renderMenuItem)}
                </ScrollView>
              ) : (
                <View>{items.map(renderMenuItem)}</View>
              )}

              {/* Optional footer */}
              {footerComponent && <View style={styles.menuFooter}>{footerComponent}</View>}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const makeStyles = (theme: Theme, _isDarkMode: boolean) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    menuContainer: {
      position: "absolute",
      borderRadius: moderateScale(12),
      paddingHorizontal: MENU_PADDING,
      elevation: 8,
      backfaceVisibility: "hidden",
      backgroundColor: theme.colors.background.default,
      shadowColor: "rgba(0, 0, 0, 0.4)",
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.4,
      shadowRadius: moderateScale(16),
    },
    menuHeader: {
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    menuTitle: {
      fontWeight: "600",
    },
    scrollContent: {
      paddingBottom: verticalScale(4),
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: verticalScale(8),
      minHeight: verticalScale(48),
    },
    disabledItem: {
      opacity: 0.5,
    },
    disabledText: {
      opacity: 0.7,
    },
    iconContainer: {
      aspectRatio: 1,
      height: verticalScale(24),
      alignItems: "center",
      justifyContent: "center",
    },
    menuText: {
      fontSize: moderateScale(16),
      flex: 1,
    },
    selectedIndicator: {
      marginRight: scale(12),
      aspectRatio: verticalScale(14),
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.divider,
      marginVertical: verticalScale(4),
    },
    menuFooter: {
      padding: verticalScale(8),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
  });

export default ReusableActionMenu;
