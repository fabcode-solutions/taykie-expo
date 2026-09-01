import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaScreen, ThemeStatusBar, ThemeText, ThemeView } from "@/components";
import { fontFamily, useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import IconCalander from "@/components/icons/IconCalander";
import Switch from "@/components/ui/Switch";
import CalanderPicker from "@/components/CalanderPicker";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useInsightStore } from "@/stores/insightStore";
import { InsightPeriod } from "@/services/api/insight";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

type InsightSegment = "day" | "week" | "month";

export default function InsightsScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const [segment, setSegment] = useState<InsightSegment>("day");
  const [shareEnabled, setShareEnabled] = useState(true);
  const [toggleCalander, setToggleCalander] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const {
    fetchUserInsights,
    userInsights,
    fetchDataToExport,
    isLoading,
    fetchUserInsightsByDate,
    fetchUserInsightsInRange,
  } = useInsightStore();

  // ─── Derived data from API ───────────────────────────────────────────────────

  const summary = userInsights?.summary;
  const timeOfDayMissed = userInsights?.timeOfDayMissed;
  const adherenceOverTime = userInsights?.adherenceOverTime;
  const suggestedAdjustments = userInsights?.suggestedAdjustments ?? [];

  // Summary metric cards — mapped from real API summary shape
  const METRICS = useMemo(
    () => [
      {
        key: "takenOnTime",
        label: t(LocalizedStrings.insights.takenOnTime),
        value: `${summary?.percentTakenOnTime ?? 0}%`,
        tone: "success" as const,
      },
      {
        key: "streak",
        label: t(LocalizedStrings.insights.streak),
        value: t("insights.streakDays", { count: summary?.currentStreak ?? 0 }),
      },
      {
        key: "missed",
        label: t(LocalizedStrings.insights.missed),
        value: summary?.missedDoses ?? 0,
        tone: "warning" as const,
      },
    ],
    [summary, t],
  );

  // Bar chart — height% proportional to each day's total missed doses
  const barDays = useMemo(() => {
    const days = timeOfDayMissed?.days ?? [];
    if (days.length === 0) return [];
    const maxTotal = Math.max(...days.map((d) => d.total), 1);
    return days.map((d) => ({
      label: d.dayLabel,
      heightPct: Math.round((d.total / maxTotal) * 100),
      dominantPeriod: d.dominantPeriod,
      total: d.total,
    }));
  }, [timeOfDayMissed]);

  // Color per dominant period
  const periodColor = (period: string) => {
    switch (period) {
      case "morning":
        return "#0095FF";
      case "afternoon":
        return "#47D257";
      case "evening":
        return "#FFB020";
      case "night":
        return "#9E77ED";
      default:
        return "#B0B0B0";
    }
  };

  // Line chart — adherence over time using real data points
  const adherencePoints = useMemo(() => {
    const data = adherenceOverTime?.data ?? [];
    // Only render points that have actual dose data
    return data.filter((d) => d.total > 0);
  }, [adherenceOverTime]);

  // Overall adherence rate from the visible points
  const overallAdherenceRate = useMemo(() => {
    if (adherencePoints.length === 0) return 0;
    const avg =
      adherencePoints.reduce((sum, d) => sum + (d.takenRate ?? 0), 0) / adherencePoints.length;
    return Math.round(avg);
  }, [adherencePoints]);

  const adherenceLevel = useMemo(() => {
    if (overallAdherenceRate >= 80) return "high";
    if (overallAdherenceRate >= 50) return "medium";
    return "low";
  }, [overallAdherenceRate]);

  const adherenceLineColor =
    adherenceLevel === "high" ? "#19A98C" : adherenceLevel === "medium" ? "#FFB020" : "#E25B45";

  // ─── Fetch logic ─────────────────────────────────────────────────────────────

  const fetchInsights = useCallback(async () => {
    try {
      await fetchUserInsights(segment as InsightPeriod);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load insights";
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), message));
    }
  }, [segment, fetchUserInsights, t]);

  const fetchInsightsByCalender = useCallback(async () => {
    try {
      if (startDate && endDate) {
        await fetchUserInsightsInRange(startDate, endDate);
      } else if (startDate && !endDate) {
        await fetchUserInsightsByDate(startDate);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load insights";
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), message));
    }
  }, [startDate, endDate, fetchUserInsightsInRange, fetchUserInsightsByDate, t]);

  useEffect(() => {
    fetchInsights();
  }, [segment]);

  useEffect(() => {
    if (startDate) fetchInsightsByCalender();
  }, [startDate, endDate]);

  // ─── Calendar handlers ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => setToggleCalander(false), []);
  const handleOpen = useCallback(() => setToggleCalander(true), []);
  const onDateRangeSelect = useCallback((start: string, end: string) => {
    setStartDate(start || null);
    setEndDate(end || null);
  }, []);

  // ─── Export ────────────────────────────────────────────────────────────────

  const fetchExportedData = useCallback(async () => {
    try {
      return await fetchDataToExport();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), message));
      return null;
    }
  }, [fetchDataToExport, t]);

  const exportAsPDF = async () => {
    try {
      const data = await fetchExportedData();
      if (!data) {
        alert.show(AlertPresets.error(t(LocalizedStrings.insights.no_data)));
        return;
      }
      const htmlContent = `
        <html>
          <body style="font-family: Arial; padding: 20px;">
            <h1>${t(LocalizedStrings.insights.export.export)}</h1>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const newPath =
        FileSystem.documentDirectory + `${t(LocalizedStrings.insights.title)}_${Date.now()}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: newPath });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newPath, {
          mimeType: "application/pdf",
          dialogTitle: "Share PDF",
        });
      } else {
        alert.show(AlertPresets.error("Sharing not available"));
      }
      alert.show(
        AlertPresets.success(
          t(LocalizedStrings.common.success),
          t(LocalizedStrings.insights.export.pdf),
        ),
      );
    } catch (err: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  const exportAsCSV = async () => {
    try {
      const data = await fetchExportedData();
      if (!data) {
        alert.show(AlertPresets.error("No Data Available"));
        return;
      }
      const flattenObject = (obj: any, prefix = ""): any => {
        let result: any = {};
        for (let key in obj) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}_${key}` : key;
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === "object") {
                Object.assign(result, flattenObject(item, `${newKey}_${index}`));
              } else {
                result[`${newKey}_${index}`] = item;
              }
            });
          } else if (typeof value === "object" && value !== null) {
            Object.assign(result, flattenObject(value, newKey));
          } else {
            result[newKey] = value;
          }
        }
        return result;
      };
      const flatData = flattenObject(data);
      const headers = Object.keys(flatData);
      const row = headers
        .map((field) => `"${String(flatData[field] ?? "").replace(/"/g, '""')}"`)
        .join(",");
      const csvString = [headers.join(","), row].join("\n");
      const fileUri = FileSystem.documentDirectory + `full_export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      alert.show(
        AlertPresets.success(
          t(LocalizedStrings.common.success),
          t(LocalizedStrings.insights.export.csv),
        ),
      );
    } catch (err: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaScreen
      withBackground={false}
      style={themedStyles.screen}
      edges={["top"]}
      showLoader={isLoading}
    >
      <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themedStyles.contentContainer}
        refreshControl={<RefreshControl onRefresh={fetchInsights} refreshing={isLoading} />}
      >
        <AppHeader />

        {/* Calendar date picker trigger */}
        <View style={themedStyles.calanderButtonStyle}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            onPress={handleOpen}
          >
            <IconCalander />
            {(startDate ?? endDate) && (
              <Text style={{ color: theme.colors.text.secondary, fontSize: moderateScale(12) }}>
                {startDate} {endDate && `- ${endDate}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <CalanderPicker
          isVisible={toggleCalander}
          handleClose={handleClose}
          mode="range"
          onDateRangeSelect={onDateRangeSelect}
        />

        {/* ── Summary metric cards ── */}
        <View style={themedStyles.metricRow}>
          {METRICS.map((metric) => (
            <ThemeView
              key={metric.key}
              style={[
                themedStyles.metricCard,
                metric.tone === "success" && themedStyles.metricCardSuccess,
                metric.tone === "warning" && themedStyles.metricCardWarning,
              ]}
              backgroundColor={theme.colors.white}
              rounded="lg"
            >
              <ThemeText variant="manrope.caption" style={themedStyles.metricLabel}>
                {metric.label}
              </ThemeText>
              <ThemeText
                variant="manrope.h4"
                style={[
                  themedStyles.metricValue,
                  metric.key === "streak" && themedStyles.metricValueStreak,
                  metric.tone === "success" && themedStyles.metricValueSuccess,
                  metric.tone === "warning" && themedStyles.metricValueWarning,
                ]}
              >
                {metric.value}
              </ThemeText>
            </ThemeView>
          ))}
        </View>

        <View style={themedStyles.chartRow}>
          {/* ── Time of day missed bar chart (real data) ── */}
          <ThemeView
            style={themedStyles.chartCard}
            backgroundColor={theme.colors.white}
            rounded="lg"
          >
            <ThemeText variant="manrope.h4" style={themedStyles.chartTitle}>
              {t(LocalizedStrings.insights.timeOfDayMissed)}
            </ThemeText>
            <View style={themedStyles.barChart}>
              {barDays.length > 0
                ? barDays.map((day, index) => (
                    <View key={day.label + index} style={themedStyles.barColumn}>
                      <View style={themedStyles.barColumInner}>
                        <View style={themedStyles.bar}>
                          <View
                            style={[
                              themedStyles.barInner,
                              {
                                height: `${Math.max(day.heightPct, 4)}%`,
                                backgroundColor: periodColor(day.dominantPeriod),
                              },
                            ]}
                          />
                        </View>
                        <ThemeText variant="manrope.caption" style={themedStyles.barDay}>
                          {day.label}
                        </ThemeText>
                      </View>
                    </View>
                  ))
                : // Fallback empty bars while loading or no data
                  ["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                    <View key={day + index} style={themedStyles.barColumn}>
                      <View style={themedStyles.barColumInner}>
                        <View style={themedStyles.bar}>
                          <View
                            style={[
                              themedStyles.barInner,
                              { height: "4%", backgroundColor: theme.colors.gray[200] },
                            ]}
                          />
                        </View>
                        <ThemeText variant="manrope.caption" style={themedStyles.barDay}>
                          {day}
                        </ThemeText>
                      </View>
                    </View>
                  ))}
              <View style={themedStyles.barAxisWrapper}>
                <View style={themedStyles.barAxis} />
                <View style={themedStyles.barAxis} />
                <View style={themedStyles.barAxis} />
                <View style={themedStyles.barAxis} />
                <View style={themedStyles.barAxis} />
              </View>
            </View>
            {/* Most missed period label */}
            {timeOfDayMissed?.mostMissedPeriod && (
              <ThemeText
                variant="manrope.button"
                align="center"
                style={themedStyles.mostMissedLabel}
              >
                Most missed: {timeOfDayMissed.mostMissedPeriod} · {timeOfDayMissed.mostMissedHour}
              </ThemeText>
            )}
          </ThemeView>

          {/* ── Adherence over time (real data) ── */}
          <ThemeView
            style={themedStyles.chartCard}
            backgroundColor={theme.colors.white}
            rounded="lg"
          >
            <View style={themedStyles.chartHeaderRow}>
              <ThemeText variant="manrope.h4" style={themedStyles.chartTitle}>
                {t(LocalizedStrings.insights.adherenceOverTime)}
              </ThemeText>
              <View style={themedStyles.segmentControl}>
                {(["day", "week", "month"] as InsightSegment[]).map((key) => {
                  const isActive = key === segment;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[themedStyles.segmentPill, isActive && themedStyles.segmentPillActive]}
                      onPress={() => {
                        setStartDate(null);
                        setEndDate(null);
                        setSegment(key);
                      }}
                      activeOpacity={0.9}
                    >
                      <ThemeText
                        variant="manrope.caption"
                        style={[
                          themedStyles.segmentLabel,
                          isActive && themedStyles.segmentLabelActive,
                        ]}
                      >
                        {t(`insights.segments.${key}`, {
                          defaultValue: key.charAt(0).toUpperCase() + key.slice(1),
                        })}
                      </ThemeText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={themedStyles.lineChart}>
              <View style={themedStyles.lineChartAxis}>
                <ThemeText variant="manrope.caption" style={themedStyles.axisLabel}>
                  100%
                </ThemeText>
                <ThemeText variant="manrope.caption" style={themedStyles.axisLabel}>
                  50%
                </ThemeText>
                <ThemeText variant="manrope.caption" style={themedStyles.axisLabel}>
                  0%
                </ThemeText>
              </View>
              <View style={themedStyles.lineChartPlot}>
                <View
                  style={[
                    themedStyles.line,
                    { backgroundColor: adherenceLevel === "high" ? "#19A98C" : "#E0E0E0" },
                  ]}
                />
                <View
                  style={[
                    themedStyles.line,
                    { backgroundColor: adherenceLevel === "medium" ? "#FFB020" : "#E0E0E0" },
                  ]}
                />
                <View
                  style={[
                    themedStyles.line,
                    { backgroundColor: adherenceLevel === "low" ? "#E25B45" : "#E0E0E0" },
                  ]}
                />
              </View>
            </View>
          </ThemeView>
        </View>

        {/* ── Suggested adjustments (real data) ── */}
        <ThemeView
          style={themedStyles.suggestionCard}
          backgroundColor={theme.colors.white}
          rounded="lg"
        >
          <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
            {t(LocalizedStrings.insights.suggestedAdjustments)}
          </ThemeText>
          <View style={themedStyles.suggestionRow}>
            {suggestedAdjustments.length > 0 ? (
              suggestedAdjustments.map((item, idx) => (
                <View key={item.type + idx} style={themedStyles.suggestionTile}>
                  <ThemeText variant="manrope.subtitle" style={themedStyles.suggestionTitle}>
                    {item.title}
                  </ThemeText>
                  {item.suggestion && (
                    <TouchableOpacity>
                      <ThemeText variant="manrope.caption" style={themedStyles.suggestionAction}>
                        → {item.suggestion}
                      </ThemeText>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={themedStyles.suggestionTile}>
                <ThemeText variant="manrope.subtitle" style={themedStyles.suggestionTitle}>
                  No suggestions right now
                </ThemeText>
              </View>
            )}
          </View>

          {/* ── Export ── */}
          <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
            {t(LocalizedStrings.insights.export.title)}
          </ThemeText>
          <View style={themedStyles.exportActionsWrapper}>
            <View style={themedStyles.exportActions}>
              <TouchableOpacity
                style={themedStyles.exportButton}
                activeOpacity={0.9}
                onPress={exportAsPDF}
              >
                <ThemeText variant="manrope.body1Bold" style={themedStyles.exportButtonText}>
                  PDF
                </ThemeText>
              </TouchableOpacity>
              <TouchableOpacity
                style={themedStyles.exportButton}
                activeOpacity={0.9}
                onPress={exportAsCSV}
              >
                <ThemeText variant="manrope.body1Bold" style={themedStyles.exportButtonText}>
                  CSV
                </ThemeText>
              </TouchableOpacity>
            </View>
            <View style={themedStyles.shareRow}>
              <ThemeText variant="manrope.subtitle" style={themedStyles.shareLabel}>
                {t(LocalizedStrings.insights.export.share)}
              </ThemeText>
              <Switch
                value={shareEnabled}
                style={themedStyles.switch}
                onPress={() => setShareEnabled((prev) => !prev)}
              />
            </View>
          </View>
        </ThemeView>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    },
    calanderButtonStyle: {
      justifyContent: "flex-end",
      flexDirection: "row",
    },
    mostMissedLabel: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(12),
    },
    metricRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    metricCard: {
      flex: 1,
      paddingVertical: theme.spacing.smd,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.spacing.smd,
      alignItems: "center",
      justifyContent: "center",
    },
    metricCardSuccess: {},
    metricCardWarning: {},
    metricLabel: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
    },
    metricValue: {
      textAlign: "center",
      fontSize: moderateScale(20),
      fontFamily: fontFamily.manrope.ExtraBold,
      fontWeight: "800" as const,
      color: theme.colors.text.primary,
    },
    metricValueStreak: {
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.regular,
      fontWeight: "400" as const,
    },
    metricValueSuccess: {
      color: theme.colors.success.main,
    },
    metricValueWarning: {
      color: "#E25B45",
    },
    chartRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    chartCard: {
      flex: 1,
      padding: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
    },
    chartHeaderRow: {
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    chartTitle: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      marginBottom: theme.spacing.sm,
    },
    // Bar chart for time-of-day missed
    barChart: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: verticalScale(85),
      position: "relative",
      columnGap: scale(10),
      paddingHorizontal: scale(5),
    },
    barColumn: {
      alignItems: "center",
      justifyContent: "flex-end",
      flexDirection: "row",
      flex: 1,
      zIndex: 1,
      position: "relative",
    },
    barAxisWrapper: {
      position: "absolute",
      width: "110%",
      left: 0,
      top: 0,
      zIndex: 0,
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: verticalScale(70),
    },
    barAxis: {
      width: "100%",
      height: verticalScale(1),
      backgroundColor: "rgba(179, 179, 179, 0.30)",
    },
    barColumInner: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
    },
    barDay: {
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      color: theme.colors.text.secondary,
      textAlign: "center",
      fontSize: moderateScale(12),
      lineHeight: verticalScale(14),
    },
    barInner: {
      borderTopStartRadius: moderateScale(2),
      borderTopEndRadius: moderateScale(2),
    },
    bar: {
      borderRadius: moderateScale(8),
      marginBottom: theme.spacing.xs,
      flex: 1,
      flexDirection: "column-reverse",
    },
    // Adherence over time chart
    adherenceChart: {
      flexDirection: "row",
      height: verticalScale(70),
    },
    lineChartAxis: {
      justifyContent: "space-between",
      marginRight: theme.spacing.sm,
    },
    axisLabel: {
      fontSize: moderateScale(10),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.secondary,
    },
    adherenceBars: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 2,
    },
    adherenceBarCol: {
      flex: 1,
      alignItems: "center",
    },
    adherenceBarTrack: {
      flex: 1,
      width: "100%",
      borderRadius: moderateScale(2),
      backgroundColor: "rgba(179,179,179,0.2)",
      flexDirection: "column-reverse",
      overflow: "hidden",
    },
    adherenceBarFill: {
      width: "100%",
      borderTopStartRadius: moderateScale(2),
      borderTopEndRadius: moderateScale(2),
    },
    adherenceBarLabel: {
      fontSize: moderateScale(9),
      color: theme.colors.text.secondary,
      marginTop: 2,
      textAlign: "center",
    },
    emptyChart: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    adherenceSummaryLabel: {
      fontSize: moderateScale(11),
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
      textAlign: "right",
    },
    segmentControl: {
      flexDirection: "row",
      borderRadius: 999,
      padding: 0,
    },
    segmentPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: 999,
    },
    segmentPillActive: {
      backgroundColor: theme.colors.black,
    },
    segmentLabel: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.divider,
    },
    segmentLabelActive: {
      color: theme.colors.white,
    },
    // Suggestions
    suggestionCard: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.mlg,
      paddingHorizontal: theme.spacing.smx,
      borderRadius: theme.spacing.smd,
    },
    cardTitle: {
      fontSize: moderateScale(14),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
      marginVertical: theme.spacing.smd,
    },
    suggestionRow: {
      flexDirection: "row",
      gap: theme.spacing.smd,
      flexWrap: "wrap",
    },
    suggestionTile: {
      flex: 1,
      minWidth: scale(120),
      borderRadius: theme.spacing.smd,
      padding: theme.spacing.sm,
      paddingBottom: theme.spacing.smx,
      backgroundColor: "rgba(255,255,255,0.85)",
      borderColor: "#DADADA",
      borderWidth: moderateScale(1),
    },
    suggestionTitle: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      lineHeight: verticalScale(21),
      marginBottom: theme.spacing.sm,
    },
    suggestionAction: {
      fontSize: moderateScale(12),
      color: theme.colors.text.secondary,
    },
    // Export
    exportActions: {
      flexDirection: "row",
      gap: theme.spacing.smd,
    },
    exportActionsWrapper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    exportButton: {
      height: verticalScale(25),
      borderRadius: moderateScale(5),
      backgroundColor: "#47D257",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: scale(28),
    },
    exportButtonText: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.white,
    },
    shareRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
    shareLabel: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },

    lineChart: {
      flexDirection: "row",
      marginTop: 0,
    },
    lineChartPlot: {
      flex: 1,
      height: verticalScale(56),
      padding: theme.spacing.xs,
      justifyContent: "space-between",
    },
    line: {
      height: verticalScale(2),
      opacity: 0.9,
    },
    lineSuccess: {
      backgroundColor: "#19A98C",
    },
    lineWarning: {
      backgroundColor: "#E25B45",
    },
  });
