import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { ThemeText } from "@/components";

export type SegmentIconRenderer = (args: { active: boolean }) => React.ReactNode;

export type Segment = {
  key: string;
  label: string;
  icon?: React.ReactNode | SegmentIconRenderer;
};

export default function SegmentedControl({
  segments,
  value,
  onChange,
  style,
}: {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle | ViewStyle[];
}) {
  const theme = useTheme();
  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.gray[100] }, style]}>
      {segments.map((s, idx) => {
        const active = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={[
              styles.segment,
              idx === 0 ? styles.left : idx === segments.length - 1 ? styles.right : undefined,
              active && { backgroundColor: theme.colors.background.default },
            ]}
          >
            <View style={styles.segmentContent}>
              {s.icon ? (typeof s.icon === "function" ? s.icon({ active }) : s.icon) : null}
              <ThemeText
                fontWeight={active ? 700 : 600}
                style={{
                  color: active ? theme.colors.text.primary : theme.colors.text.disabled,
                  fontSize: 10,
                }}
              >
                {s.label}
              </ThemeText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 10,
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  segment: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  left: { marginRight: 8 },
  right: { marginLeft: 8 },
});
