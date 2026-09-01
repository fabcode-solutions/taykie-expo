import React, { useMemo, useState, useCallback, ReactNode } from "react";
import { TouchableOpacity, View, StyleSheet, ScrollView } from "react-native";
import { ThemeText } from "@/components/primitives";
import { fontFamily, useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface TabsProps {
  variant?: "default" | "no-bg";
  backgroundColor?: string;
  segments: { icon?: ReactNode; key: string; label: string }[];
  onSelect: (key: string | string[]) => void;
  initialKey?: string | string[];
  fullWidth?: boolean;
  multiSelect?: boolean;
}

const Tabs: React.FC<TabsProps> = ({
  variant = "default",
  backgroundColor,
  segments,
  onSelect,
  initialKey,
  fullWidth = true,
  multiSelect = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Safely initialize state as an array to handle both single and multi select internally
  const [activeKeys, setActiveKeys] = useState<string[]>(() => {
    if (Array.isArray(initialKey)) return initialKey;
    if (initialKey) return [initialKey];
    return segments[0] ? [segments[0].key] : [];
  });

  const handleSelect = useCallback(
    (key: string) => {
      if (multiSelect) {
        setActiveKeys((prev) => {
          // Toggle logic for multi-select
          const newKeys = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
          onSelect(newKeys);
          return newKeys;
        });
      } else {
        // Standard single-select logic for backward compatibility
        setActiveKeys([key]);
        onSelect(key);
      }
    },
    [multiSelect, onSelect],
  );

  return segments.length > 2 ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View
        style={[
          variant === "default" ? styles.segmentGroup : styles.segmentGroupNoBg,
          backgroundColor && { backgroundColor },
        ]}
      >
        {segments.map(({ icon, key, label }) => {
          const isActive = activeKeys.includes(key); // Updated check
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => handleSelect(key)}
              style={[
                variant === "default" ? styles.segmentButton : styles.segmentButtonNoBG,
                isActive && styles.segmentButtonActive,
                fullWidth && { flex: 1 },
              ]}
            >
              {icon && icon}
              <ThemeText
                variant="manrope.body1Bold"
                style={[styles.segmentText, isActive && styles.segmentTextActive]}
              >
                {label}
              </ThemeText>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  ) : (
    <View
      style={[
        variant === "default" ? styles.segmentGroup : styles.segmentGroupNoBg,
        backgroundColor && { backgroundColor },
      ]}
    >
      {segments.map(({ icon, key, label }) => {
        const isActive = activeKeys.includes(key);

        // Determine the color based on isActive status
        const iconColor = isActive ? theme.colors.white : theme.colors.taupe;

        // Clone the icon element to inject the dynamic color
        const renderedIcon = React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement, {
              color: iconColor,
            })
          : null;

        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => handleSelect(key)}
            style={[
              variant === "default" ? styles.segmentButton : styles.segmentButtonNoBG,
              isActive && styles.segmentButtonActive,
              fullWidth && { flex: 1 },
            ]}
          >
            {renderedIcon}
            <ThemeText
              align="center"
              variant="manrope.body1Bold"
              style={[styles.segmentText, isActive && styles.segmentTextActive]}
            >
              {label}
            </ThemeText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default React.memo(Tabs);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    segmentGroup: {
      flexDirection: "row",
      backgroundColor: theme.colors.background.default,
      padding: theme.spacing.xs,
      borderRadius: moderateScale(24),
      marginBottom: verticalScale(20),
      alignSelf: "flex-start",
      alignItems: "stretch",
      gap: scale(8),
    },
    segmentGroupNoBg: {
      flexDirection: "row",
      gap: scale(8),
      padding: theme.spacing.xs,
      borderRadius: moderateScale(24),
      marginBottom: verticalScale(20),
      alignSelf: "flex-start",
      alignItems: "stretch",
    },
    segmentButton: {
      flexDirection: "row",
      minHeight: verticalScale(40),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(4),
      gap: scale(4),
    },
    segmentButtonNoBG: {
      flexDirection: "row",
      minHeight: verticalScale(40),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(4),
      borderWidth: scale(1),
      borderColor: "#D5CCBD",
      gap: scale(4),
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.slateCharcoal,
      shadowColor: theme.colors.black,
      borderColor: theme.colors.slateCharcoal,
    },
    segmentText: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.taupe,
      flexShrink: 1,
      textAlign: "center",
    },
    segmentTextActive: {
      color: theme.colors.white,
    },
  });
