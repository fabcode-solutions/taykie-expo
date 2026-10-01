import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface TimePickerSheetProps {
  visible: boolean;
  value: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

/**
 * Time picker shown as a popup, never inline in a form.
 *
 * - iOS: bottom sheet with Cancel / Done around a spinner. themeVariant="light" + an
 *   explicit textColor: the app is light-only, but the native spinner follows the
 *   PHONE's appearance — in dark mode it drew light text on our light background.
 * - Android: the native time dialog, opened imperatively (DateTimePickerAndroid.open)
 *   so it can never render inside the parent layout.
 */
export function TimePickerSheet({
  visible,
  value,
  title,
  onConfirm,
  onCancel,
}: TimePickerSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // iOS edits a draft; it's only committed on Done.
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  // Android: open the native dialog whenever `visible` turns on.
  useEffect(() => {
    if (Platform.OS !== "android" || !visible) return;
    DateTimePickerAndroid.open({
      value,
      mode: "time",
      is24Hour: false,
      positiveButton: { label: t(LocalizedStrings.common.ok) },
      negativeButton: { label: t(LocalizedStrings.common.cancel) },
      onChange: (event, date) => {
        if (event.type === "set" && date) onConfirm(date);
        else onCancel();
      },
    });
    return () => {
      DateTimePickerAndroid.dismiss("time");
    };
    // Re-open only when `visible` flips on, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS === "android") return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, verticalScale(12)) }]}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onCancel} hitSlop={8} accessibilityRole="button">
            <Text style={styles.cancel}>{t(LocalizedStrings.common.cancel)}</Text>
          </TouchableOpacity>
          {!!title && <Text style={styles.title}>{title}</Text>}
          <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.done}>{t(LocalizedStrings.common.done)}</Text>
          </TouchableOpacity>
        </View>
        <DateTimePicker
          value={draft}
          mode="time"
          display="spinner"
          themeVariant="light"
          textColor={theme.colors.text.primary}
          onChange={(_, date) => date && setDraft(date)}
          style={styles.picker}
        />
      </View>
    </Modal>
  );
}

export default TimePickerSheet;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
      backgroundColor: theme.colors.white,
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(12),
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: verticalScale(8),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    title: {
      fontSize: moderateScale(15),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.text.primary,
    },
    cancel: {
      fontSize: moderateScale(15),
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.secondary,
    },
    done: {
      fontSize: moderateScale(15),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.primary.dark,
    },
    picker: {
      alignSelf: "stretch",
      backgroundColor: theme.colors.white,
    },
  });
