import { Button } from "@/components/ui/button";
import React, { useCallback, useMemo, useState } from "react";
import { BottomDrawer } from "./BottomDrawer";
import { Calendar, DateData } from "react-native-calendars";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { MarkingTypes } from "react-native-calendars/src/types";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface CalanderPickerProps {
  isVisible: boolean;
  handleClose: () => void;
  onDateSelect?: (date: string) => void;
  onDateRangeSelect?: (startDate: string, endDate: string) => void;
  mode?: "single" | "range";
  contentStyle?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  animationType?: "none" | "slide" | "fade";
  initialDate?: string;
  minDate?: string;
  maxDate?: string;
}
interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    marked?: boolean;
    startingDay?: boolean;
    endingDay?: boolean;
    color?: string;
    textColor?: string;
    dotColor?: string;
  };
}
const CalanderPicker = ({
  isVisible,
  handleClose,
  onDateSelect,
  onDateRangeSelect,
  mode = "single",
  contentStyle,
  blurIntensity,
  animationType,
  initialDate,
  minDate,
  maxDate,
}: CalanderPickerProps) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const intensity = blurIntensity ?? (theme.mode === "dark" ? 40 : 50);
  const tint = theme.mode === "dark" ? "dark" : "light";

  const themedStyles = useMemo(() => createStyles(theme), [theme]);

  // Calendar theme configuration matching design
  const calendarTheme = useMemo(
    () => ({
      "backgroundColor": theme.colors.background.default,
      "calendarBackground": theme.colors.background.default,
      "textSectionTitleColor": "#6B6B6B",
      "selectedDayBackgroundColor": theme.colors.background.default,
      "selectedDayTextColor": theme.colors.white,
      "todayTextColor": theme.colors.text.primary,
      "dayTextColor": theme.colors.text.primary,
      "textDisabledColor": "#CCCCCC",
      "dotColor": theme.colors.text.primary,
      "selectedDotColor": theme.colors.white,
      "arrowColor": theme.colors.text.primary,
      "monthTextColor": theme.colors.text.primary,
      "indicatorColor": theme.colors.text.primary,
      "textDayFontFamily": fontFamily.manrope.medium,
      "textMonthFontFamily": fontFamily.manrope.semiBold,
      "textDayHeaderFontFamily": fontFamily.manrope.medium,
      "textDayFontWeight": "500" as const,
      "textMonthFontWeight": "600" as const,
      "textDayHeaderFontWeight": "500" as const,
      "textDayFontSize": moderateScale(16),
      "textMonthFontSize": moderateScale(18),
      "textDayHeaderFontSize": moderateScale(14),
      "stylesheet.calendar.header": {
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: scale(10),
          paddingVertical: verticalScale(12),
          alignItems: "center",
          backgroundColor: theme.colors.background.default,
        },
        monthText: {
          fontSize: moderateScale(18),
          fontFamily: fontFamily.manrope.semiBold,
          fontWeight: "600" as const,
          color: theme.colors.text.primary,
        },
        arrow: {
          padding: verticalScale(8),
        },
        arrowImage: {
          tintColor: theme.colors.text.primary,
        },
        week: {
          marginTop: verticalScale(7),
          flexDirection: "row",
          justifyContent: "space-around",
          paddingHorizontal: scale(10),
        },
        dayHeader: {
          marginTop: verticalScale(2),
          marginBottom: verticalScale(7),
          width: scale(32),
          textAlign: "center",
          fontSize: moderateScale(14),
          fontFamily: fontFamily.manrope.medium,
          fontWeight: "500" as const,
          color: "#6B6B6B",
        },
      },
      "stylesheet.day.basic": {
        base: {
          aspectRatio: 1,
          height: verticalScale(32),
          alignItems: "center",
          justifyContent: "center",
        },
        text: {
          marginTop: 0,
          fontSize: moderateScale(16),
          fontFamily: fontFamily.manrope.medium,
          fontWeight: "500" as const,
          color: theme.colors.text.primary,
          backgroundColor: "transparent",
        },
        selected: {
          backgroundColor: theme.colors.text.primary,
          borderRadius: moderateScale(8),
        },
        today: {
          backgroundColor: "transparent",
        },
        todayText: {
          color: theme.colors.text.primary,
          fontWeight: "600" as const,
        },
        selectedText: {
          color: theme.colors.white,
          fontWeight: "600" as const,
        },
        disabledText: {
          color: "#CCCCCC",
        },
      },
      "stylesheet.calendar.main": {
        container: {
          backgroundColor: theme.colors.background.default,
          paddingHorizontal: scale(5),
        },
        week: {
          marginVertical: verticalScale(4),
          flexDirection: "row",
          justifyContent: "space-around",
        },
      },
    }),
    [],
  );

  // Generate marked dates based on selection mode
  const markedDates: MarkedDates = useMemo(() => {
    if (mode === "single" && selectedDate) {
      return {
        [selectedDate]: {
          selected: true,
          marked: true,
          selectedColor: theme.colors.text.primary,
        },
      };
    }

    if (mode === "range" && startDate) {
      const marks: MarkedDates = {};

      marks[startDate] = {
        startingDay: true,
        color: theme.colors.text.primary,
        textColor: theme.colors.white,
      };

      if (endDate) {
        marks[endDate] = {
          endingDay: true,
          color: theme.colors.text.primary,
          textColor: theme.colors.white,
        };

        // Mark dates in between
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);

        while (current < end) {
          current.setDate(current.getDate() + 1);
          const dateStr = current.toISOString().split("T")[0];
          if (dateStr !== endDate) {
            marks[dateStr] = {
              color: "#E5E5E5",
              textColor: theme.colors.text.primary,
            };
          }
        }
      }

      return marks;
    }

    return {};
  }, [mode, selectedDate, startDate, endDate]);

  // Handle date press based on mode
  const handleDayPress = useCallback(
    (day: DateData) => {
      const dateString = day.dateString;

      if (mode === "single") {
        setSelectedDate(dateString);
        onDateSelect?.(dateString);
      } else {
        // If we haven't started a range, or we already have a full range, start fresh
        if (!startDate || (startDate && endDate)) {
          setStartDate(dateString);
          setEndDate(null);
          // Only notify parent of the start
          onDateRangeSelect?.(dateString, "");
        } else {
          // We have a start date, now we are picking the end date
          const start = new Date(startDate);
          const selected = new Date(dateString);

          if (selected < start) {
            // If user picks a date BEFORE the start date, make it the new start
            setStartDate(dateString);
            setEndDate(startDate);
            onDateRangeSelect?.(dateString, startDate);
          } else {
            setEndDate(dateString);
            onDateRangeSelect?.(startDate, dateString);
          }
        }
      }
    },
    [mode, startDate, endDate, onDateSelect, onDateRangeSelect],
  );

  // Handle filter/apply button press
  const handleApply = useCallback(() => {
    if (mode === "single" && selectedDate) {
      onDateSelect?.(selectedDate);
    } else if (mode === "range" && startDate) {
      // We pass both, even if endDate is null, so the parent can decide to fetch
      onDateRangeSelect?.(startDate, endDate || "");
    }
    handleClose();
  }, [mode, selectedDate, startDate, endDate, onDateSelect, onDateRangeSelect, handleClose]);

  // Handle clear selection
  const handleClear = useCallback(() => {
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
  }, []);
  return (
    <BottomDrawer
      headingStyle={themedStyles.headingStyle}
      isVisible={isVisible}
      onClose={handleClose}
      title={t(LocalizedStrings.common.select_date)}
      height="60%"
      showHandle
      closeOnBackdropPress
      closeOnSwipeDown
      backdropBlurIntensity={15}
      drawerBlurIntensity={2}
      enableDrawerBlur
    >
      <View style={{ paddingHorizontal: scale(16) }}>
        <Calendar
          current={initialDate}
          minDate={minDate}
          maxDate={maxDate}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          markingType={mode === "range" ? ("period" as MarkingTypes) : ("simple" as MarkingTypes)}
          theme={calendarTheme}
          style={themedStyles.calendar}
          enableSwipeMonths
          firstDay={1}
        />
        <Button
          title={t(LocalizedStrings.common.done)}
          onPress={handleApply}
          style={themedStyles.signInButton}
          rightIcon={null}
        />
      </View>
    </BottomDrawer>
  );
};

export default CalanderPicker;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    signInButton: {
      backgroundColor: theme.colors.primary.main,
      height: verticalScale(64),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      marginTop: verticalScale(28),
    },
    headingStyle: {
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      fontSize: moderateScale(24),
      color: theme.colors.text.primary,
      lineHeight: verticalScale(29),
    },
    blurContainer: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    content: {
      width: "100%",
      maxWidth: scale(400),
      backgroundColor: "#F5F3F0",
      borderRadius: theme.spacing.lg,
      padding: theme.spacing.lg,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: verticalScale(8) },
      shadowOpacity: 0.15,
      shadowRadius: moderateScale(24),
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(18),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
    },
    clearButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    clearText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
    },
    calendar: {
      borderRadius: theme.spacing.sm,
      overflow: "hidden",
    },
    footer: {
      marginTop: theme.spacing.lg,
      flexDirection: "row",
      justifyContent: "center",
    },
    applyButton: {
      flex: 1,
      height: verticalScale(48),
      backgroundColor: theme.colors.text.primary,
      borderRadius: theme.spacing.sm,
      justifyContent: "center",
      alignItems: "center",
    },
    applyButtonDisabled: {
      backgroundColor: "#CCCCCC",
      shadowOpacity: 0,
      elevation: 0,
    },
    applyButtonText: {
      color: theme.colors.white,
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
    },
  });
