"use client";

import React, { useCallback, useEffect } from "react";
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaScreen, ThemeStatusBar, ThemeText, ThemeView } from "@/components";
import { fontFamily, useTheme } from "@/theme";
import type { Theme } from "@/theme";
import AppHeader from "@/components/AppHeader";
import IconSearch from "@/components/icons/IconSearch";
import IconRefresh from "@/components/icons/IconRefresh";
import IconRemane from "@/components/icons/IconRemane";
import { router } from "expo-router";
import {
  useBLEStore,
  useBLEDeviceData,
  useBLEConnection,
  useBLEScanning,
  useBLEPermissions,
  useBLECompartments,
} from "@/stores/bleStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { Loader } from "@/components/shared/loader";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets, AlertBuilder } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { Button } from "@/components/ui/button";
import Switch from "@/components/ui/Switch";
import { TONE_OPTIONS, DEFAULT_TONE_INDEX, DEFAULT_VOLUME_LEVEL } from "@/utils/toneAudio";

type DeviceActionKey = "find" | "history" | "rename" | "dismiss";
interface DeviceAction {
  key: DeviceActionKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  detail?: string;
}

const ACTIONS: DeviceAction[] = [
  { key: "dismiss", label: "Dismiss Active Alert", icon: "notifications-off" },
  { key: "history", label: "Sync History", icon: "refresh" },
  { key: "find", label: "Find My Taykie", icon: "search", detail: "v1.4.2" },
  { key: "rename", label: "Rename Device", icon: "pencil" },
];

export default function DeviceScreen() {
  const theme = useTheme();
  const alert = useAlert();

  // Store selectors
  const { isScanning, scannedDevices } = useBLEScanning();
  const { connectionStatus } = useBLEConnection();
  const {
    batteryLevel,
    isCharging,
    toneIndex: rawToneIndex,
    volumeLevel: rawVolumeLevel,
    schedules,
    lastSyncedAt,
  } = useBLEDeviceData();
  // Never-selected (null) resolves to Mute (0) — same default used
  // everywhere else (reminders, notification channels, banner preview) —
  // so the picker visually shows Mute selected rather than nothing.
  const toneIndex = rawToneIndex ?? DEFAULT_TONE_INDEX;
  const volumeLevel = rawVolumeLevel ?? DEFAULT_VOLUME_LEVEL;
  const { historyRecords, refreshCompartmentActivity } = useBLECompartments();
  const {
    scanDevices,
    stopScan,
    connectedDevice,
    connectToDevice,
    disconnectDevice,
    initBLE,
    startHistorySync,
    dismissAlert,
    setDeviceVolume,
    setDeviceTone,
    toggleScheduleSlot,
    eraseHistory,
  } = useBLEStore();
  const { hasPermissions, isBluetoothEnabled } = useBLEPermissions();
  const dose_frequency = useOnboardingStore((s) => s.dose_frequency);
  const [isRefreshingCompartments, setIsRefreshingCompartments] = React.useState(false);

  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);
  // 1. Initialize BLE on mount
  useEffect(() => {
    initBLE();

    return () => {
      stopScan(); // Cleanup when leaving screen
    };
  }, []);

  // 2. Watch the permissions. ONLY start scanning once they are both true.
  React.useEffect(() => {
    const checkStatus = async () => {
      // If we don't have permissions yet, we wait (initBLE handles the initial request)
      if (!hasPermissions) {
        console.log("🟡 Waiting for permissions...");
        return;
      }

      // If permissions are granted but Bluetooth is OFF
      if (hasPermissions && !isBluetoothEnabled) {
        console.log("🔴 Permissions granted, but Bluetooth is OFF");
        alert.show(
          AlertPresets.error(
            t(LocalizedStrings.device.bluetooth.alert),
            t(LocalizedStrings.device.bluetooth.alertMessage),
          ),
        );
        return;
      }

      // If both are true, start scanning
      if (hasPermissions && isBluetoothEnabled) {
        console.log("🟢 All systems go! Starting scan...");
        try {
          await scanDevices();
        } catch (error) {
          alert.show(AlertPresets.error(t(LocalizedStrings.common.error), JSON.stringify(error)));
        }
      }
    };

    checkStatus();
  }, [hasPermissions, isBluetoothEnabled, scanDevices]);

  

  // The device reports 0xFF instead of a percentage while charging, so that
  // state shows "Charging" as the value itself rather than a number. With
  // no reading at all yet, show a plain "--" (not "--%").
  const displayBattery = isCharging
    ? "Charging"
    : batteryLevel !== null
      ? `${batteryLevel}%`
      : "--";
  const batteryWidth = batteryLevel !== null ? `${batteryLevel}%` : "0%";
  console.log("batteryLevel=======",batteryLevel, lastSyncedAt)

  // Relative time, used for both "last opened" and "last synced".
  const formatRelativeTime = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return "--";
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };
  // "Today, 10:42 AM" style — matches the design's Last Sync tile.
  const formatSyncTime = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return "--";
    const isToday = date.toDateString() === new Date().toDateString();
    const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return isToday ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
  };
  const displayLastSync = lastSyncedAt ? formatSyncTime(lastSyncedAt) : "--";
  // "Lid" here doesn't mean live open/closed — the protocol has no confirmed
  // field for that (F3 status doesn't report it; whether F6's "reserved"
  // byte secretly encodes it is still unconfirmed, see the console logging
  // in BLEService). This is the real data we do have: when the compartment
  // was last accessed, shown as its own caption under the Compartments grid
  // rather than a top-level stat.
  const displayLastOpened =
    historyRecords.length > 0 ? formatRelativeTime(historyRecords[0].timestamp) : null;

  const CONNECTION_STATS = [
    {
      key: "status",
      label: "Connection",
      value: connectionStatus === "connected" ? "Online" : "Offline",
      icon: "bluetooth",
    },
    {
      key: "battery",
      label: isCharging ? "Battery (Charging)" : "Battery",
      value: displayBattery,
      icon: isCharging ? "battery-charging" : "battery-full",
    },
    {
      key: "lastSync",
      label: "Last Sync",
      value: displayLastSync,
      icon: "sync-outline",
    },
  ] as const;

  // The physical device is a 7 (day) x N (dose-time) compartment grid,
  // where N is the number of doses/day the user chose during onboarding
  // (dosage-frequency screen: 1, 2, or 3 — editable later from Settings >
  // Dosage & Compartments). The protocol has no per-compartment id, so this
  // is derived purely from the active schedule: each of up to 10 schedule
  // slots is a "row" (a single dose time), and its weekday bitmask marks
  // which day-columns it covers.
  const COMPARTMENT_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // bit0=Sun .. bit6=Sat
  const COMPARTMENT_ROW_COUNT = dose_frequency;
  const enabledScheduleSlots = React.useMemo(
    () =>
      (schedules ?? [])
        .filter((slot) => slot.enabled)
        .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)),
    [schedules],
  );
  const compartmentGridRows = enabledScheduleSlots.slice(0, COMPARTMENT_ROW_COUNT);
  const overflowScheduleCount = Math.max(
    0,
    enabledScheduleSlots.length - COMPARTMENT_ROW_COUNT,
  );
  // Highlight today's compartment: Date.getDay() already uses the same
  // 0=Sunday..6=Saturday convention as the protocol's weekday bitmask, so
  // this maps directly onto the grid's day columns.
  const todayDayIndex = new Date().getDay();
  const todayRowIndex = compartmentGridRows.findIndex(
    (slot) => (slot.weekdayBitmask & (1 << todayDayIndex)) !== 0,
  );

  // Helper to parse day bitmask. Per protocol: bit0 = Sunday .. bit6 = Saturday.
  const formatDays = (bitmask: number) => {
    if (bitmask === 0x7f) return "Every day";
    if (bitmask === 0x3e) return "Weekdays"; // Mon-Fri: bits 1-5
    if (bitmask === 0x41) return "Weekends"; // Sat+Sun: bits 6,0
    if (bitmask === 0x00) return "No days";

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const active = days.filter((_, i) => bitmask & (1 << i));
    return active.join(", ");
  };

  // Formats a compartment-activity timestamp as e.g. "Sep 3, 2:32 PM"
  const formatEventTime = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return isoTimestamp;
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleConnectToDevice = useCallback(
    async (deviceId: string) => {
      // Guard against a second tap firing a concurrent connect attempt
      // while one is already in flight (the earlier attempt would get torn
      // down mid-handshake by BLEService.connectToDevice's own
      // disconnect-then-reconnect logic, surfacing as a spurious "device
      // disconnected" error).
      if (connectionStatus !== "disconnected") return;
      try {
        await connectToDevice(deviceId);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [connectionStatus],
  );

  const handleDisconnect = useCallback(() => {
    // A confirm-style alert (one with an .action()) has no close button of
    // its own — Alert.tsx only renders one when there's no action — and
    // .duration(0) means it won't auto-dismiss either. Without explicitly
    // hiding it here, tapping "Disconnect" fired the action but left the
    // banner stuck on screen indefinitely.
    const alertId = alert.show(
      new AlertBuilder()
        .type("warning")
        .title(t(LocalizedStrings.device.disconnect.title))
        .message(t(LocalizedStrings.device.disconnect.message))
        .action(t(LocalizedStrings.device.disconnect.button), async () => {
          alert.hide(alertId);
          try {
            await disconnectDevice();
          } catch (error: any) {
            alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
          }
        })
        .duration(0)
        .build(),
    );
  }, []);

  const handleRefreshCompartments = useCallback(async () => {
    setIsRefreshingCompartments(true);
    try {
      await refreshCompartmentActivity();
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    } finally {
      setIsRefreshingCompartments(false);
    }
  }, []);

  // Test-only control: wipes the device's history so the next F6 reply is
  // short enough to decode the real byte layout unambiguously (see the
  // eraseHistory action for why). Destructive, so it's gated behind an
  // explicit confirmation rather than firing on a single tap.
  const handleEraseHistory = useCallback(() => {
    const alertId = alert.show(
      new AlertBuilder()
        .type("warning")
        .title("Erase Device History?")
        .message(
          "This permanently wipes all compartment history stored on the device. Only do this for testing.",
        )
        .action("Erase", async () => {
          alert.hide(alertId);
          try {
            await eraseHistory();
          } catch (error: any) {
            alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
          }
        })
        .duration(0)
        .build(),
    );
  }, []);

  return (
    <>
      {connectionStatus === "connecting" && <Loader />}
      <SafeAreaScreen withBackground={false} style={themedStyles.screen}>
        <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={themedStyles.contentContainer}
        >
          <AppHeader />

          {/* CONNECTION & HARDWARE STATUS CARD */}
          <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
            <View style={themedStyles.connectionHeader}>
              <View style={themedStyles.connectionHeaderTitle}>
                <View style={themedStyles.connectionIcon}>
                  <Ionicons name="bluetooth" size={moderateScale(16)} color={"#0095FF"} />
                </View>
                <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                  {t(LocalizedStrings.device.connection.title)}
                </ThemeText>
              </View>
              {connectionStatus === "connected" && (
                <TouchableOpacity
                  onPress={handleDisconnect}
                  style={themedStyles.disconnectButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={moderateScale(16)} color="#FF3B30" />
                  <ThemeText variant="manrope.caption" style={themedStyles.disconnectButtonText}>
                    {t(LocalizedStrings.common.disconnect)}
                  </ThemeText>
                </TouchableOpacity>
              )}
            </View>
            <View style={themedStyles.connectionStatsRow}>
              {CONNECTION_STATS.map((stat) => (
                <View key={stat.key} style={themedStyles.connectionStat}>
                  <ThemeText variant="manrope.caption" style={themedStyles.statLabel}>
                    {stat.label}
                  </ThemeText>
                  {stat.key === "battery" ? (
                    <View style={themedStyles.batteryWrapper}>
                      <View style={themedStyles.batteryTrack}>
                        <View
                          style={[
                            themedStyles.batteryFill,
                            {
                              width: batteryWidth,
                              backgroundColor: isCharging ? "#FFC107" : "#47D257",
                            },
                          ]}
                        />
                      </View>
                      <ThemeText variant="manrope.body1Bold" style={themedStyles.batteryText}>
                        {stat.value}
                      </ThemeText>
                    </View>
                  ) : (
                    <ThemeText
                      variant="manrope.subtitle"
                      style={[
                        themedStyles.statValue,
                        stat.value === "Online" && themedStyles.onlineText,
                      ]}
                    >
                      {stat.value}
                    </ThemeText>
                  )}
                </View>
              ))}
            </View>
          </ThemeView>

          {/* DEVICE AUDIO SETTINGS CARD */}
          {connectionStatus === "connected" && (
            <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
              <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                {t(LocalizedStrings.device.audio_settings)}
              </ThemeText>

              {/* Volume Control (0-5) */}
              <ThemeText variant="manrope.body1Bold" style={themedStyles.settingLabel}>
                {t(LocalizedStrings.device.volume_level)}
              </ThemeText>
              <View style={themedStyles.volumeContainer}>
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={`vol-${level}`}
                    style={[
                      themedStyles.volumeNode,
                      volumeLevel === level && themedStyles.volumeNodeActive,
                    ]}
                    onPress={() => {
                      // setDeviceVolume already triggers the device's speaker
                      // itself as its preview mechanism — calling
                      // triggerDeviceSoundForReminder() here too fired a
                      // second, duplicate F4 SoundControl write for every
                      // tap (confirmed in device logs), which is a likely
                      // contributor to devices dropping mid-write.
                      setDeviceVolume(level);
                    }}
                  >
                    <ThemeText
                      style={volumeLevel === level ? themedStyles.textWhite : themedStyles.textDark}
                    >
                      {level === 0 ? "Mute" : level}
                    </ThemeText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tone Control (0-5) */}
              <ThemeText variant="manrope.body1Bold" style={themedStyles.settingLabel}>
                {t(LocalizedStrings.device.alert_tone)}
              </ThemeText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={themedStyles.toneContainer}
              >
                {TONE_OPTIONS.map((tone) => (
                  <TouchableOpacity
                    key={`tone-${tone.value}`}
                    style={[
                      themedStyles.toneNode,
                      toneIndex === tone.value && themedStyles.toneNodeActive,
                    ]}
                    onPress={() => {
                      // Same reasoning as the volume handler above —
                      // setDeviceTone already triggers the device's speaker
                      // itself; triggerDeviceSoundForReminder() here was a
                      // redundant, duplicate F4 write.
                      setDeviceTone(tone.value);
                    }}
                  >
                    <ThemeText
                      style={
                        toneIndex === tone.value ? themedStyles.textWhite : themedStyles.textDark
                      }
                    >
                      {tone.label}
                    </ThemeText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemeView>
          )}

          {/* SCHEDULES OVERVIEW CARD */}
          {connectionStatus === "connected" && (
            <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
              <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                {t(LocalizedStrings.device.active_schedules)}
              </ThemeText>
              <View style={themedStyles.schedulesContainer}>
                {schedules?.map((schedule, index) => (
                  <View
                    key={index}
                    style={[
                      themedStyles.scheduleRow,
                      !schedule.enabled && themedStyles.scheduleDisabled,
                    ]}
                  >
                    <View>
                      <ThemeText
                        variant="manrope.body1Bold"
                        style={{ fontSize: moderateScale(18) }}
                      >
                        {schedule?.hour?.toString().padStart(2, "0") ?? "00"}:
                        {schedule?.minute?.toString().padStart(2, "0") ?? "00"}
                      </ThemeText>
                      <ThemeText variant="manrope.caption">
                        {formatDays(schedule.weekdayBitmask)}
                      </ThemeText>
                    </View>
                    <Switch
                      value={schedule.enabled}
                      onPress={() => toggleScheduleSlot(index)}
                      style={themedStyles.scheduleSwitch}
                    />
                  </View>
                ))}
                {(!schedules || schedules.length === 0) && (
                  <ThemeText variant="manrope.caption">
                    {t(LocalizedStrings.device.no_schedules_loaded)}
                  </ThemeText>
                )}
              </View>
            </ThemeView>
          )}

          {/* COMPARTMENTS CARD (7 days x N dose-times, from the active schedule) */}
          {connectionStatus === "connected" && (
            <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
              <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                Compartments
              </ThemeText>

              <View style={themedStyles.compartmentGrid}>
                {Array.from({ length: COMPARTMENT_ROW_COUNT }).map((_, rowIndex) => {
                  const slot = compartmentGridRows[rowIndex];
                  return (
                    <View key={rowIndex} style={themedStyles.compartmentGridRow}>
                      {COMPARTMENT_DAY_LABELS.map((_, dayIndex) => {
                        const filled = slot ? (slot.weekdayBitmask & (1 << dayIndex)) !== 0 : false;
                        const isToday = rowIndex === todayRowIndex && dayIndex === todayDayIndex;
                        return (
                          <View
                            key={dayIndex}
                            style={[
                              themedStyles.compartmentGridCell,
                              filled && themedStyles.compartmentGridCellFilled,
                              isToday && themedStyles.compartmentGridCellToday,
                            ]}
                          />
                        );
                      })}
                    </View>
                  );
                })}
              </View>

              {displayLastOpened && (
                <ThemeText variant="manrope.caption" style={themedStyles.compartmentEmptyText}>
                  Last opened {displayLastOpened}
                </ThemeText>
              )}
              {compartmentGridRows.length === 0 && (
                <ThemeText variant="manrope.caption" style={themedStyles.compartmentEmptyText}>
                  No active schedule yet — set up to {COMPARTMENT_ROW_COUNT} dose time
                  {COMPARTMENT_ROW_COUNT > 1 ? "s" : ""} to fill the compartment layout.
                </ThemeText>
              )}
              {overflowScheduleCount > 0 && (
                <ThemeText variant="manrope.caption" style={themedStyles.compartmentEmptyText}>
                  +{overflowScheduleCount} more scheduled time(s) beyond your {COMPARTMENT_ROW_COUNT}
                  -dose-per-day plan (change this under Settings › Dosage & Compartments).
                </ThemeText>
              )}
            </ThemeView>
          )}

          {/* COMPARTMENT ACTIVITY CARD */}
          {connectionStatus === "connected" && (
            <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
              <View style={themedStyles.compartmentHeader}>
                <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                  Compartment Activity
                </ThemeText>
                <View style={themedStyles.compartmentHeaderActions}>
                  <TouchableOpacity
                    onPress={handleEraseHistory}
                    style={themedStyles.compartmentEraseButton}
                    activeOpacity={0.7}
                  >
                    <ThemeText
                      variant="manrope.caption"
                      style={themedStyles.compartmentEraseButtonText}
                    >
                      Erase (Test)
                    </ThemeText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRefreshCompartments}
                    disabled={isRefreshingCompartments}
                    style={themedStyles.compartmentRefreshButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="refresh"
                      size={moderateScale(16)}
                      color={"green"}
                      style={isRefreshingCompartments ? { opacity: 0.4 } : undefined}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {historyRecords.length === 0 ? (
                <View style={themedStyles.compartmentEmpty}>
                  <Ionicons
                    name="cube-outline"
                    size={moderateScale(32)}
                    color={theme.colors.text.secondary}
                  />
                  <ThemeText variant="manrope.caption" style={themedStyles.compartmentEmptyText}>
                    No compartment activity recorded yet. Tap refresh to check the device.
                  </ThemeText>
                </View>
              ) : (
                <>
                  <View style={themedStyles.compartmentLastRow}>
                    <Ionicons
                      name="time-outline"
                      size={moderateScale(18)}
                      color={theme.colors.primary.main}
                    />
                    <ThemeText variant="manrope.body1Bold" style={themedStyles.compartmentLastText}>
                      Last accessed {formatEventTime(historyRecords[0].timestamp)}
                    </ThemeText>
                  </View>
                  <View style={themedStyles.compartmentList}>
                    {historyRecords.slice(0, 5).map((record, index) => (
                      <View
                        key={`${record.timestamp}-${index}`}
                        style={themedStyles.compartmentListItem}
                      >
                        <Ionicons
                          name="ellipse"
                          size={moderateScale(6)}
                          color={theme.colors.text.secondary}
                        />
                        <ThemeText
                          variant="manrope.caption"
                          style={themedStyles.compartmentListItemText}
                        >
                          {formatEventTime(record.timestamp)}
                        </ThemeText>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ThemeView>
          )}

          {/* ACTIONS CARD */}
          <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
            <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
              {t(LocalizedStrings.device.actions.quick_action)}
            </ThemeText>
            <View style={themedStyles.actionsList}>
              {ACTIONS.map((action) => (
                <TouchableOpacity
                  onPress={() => {
                    if (action.key === "history") startHistorySync();
                    else if (action.key === "dismiss") dismissAlert();
                    else if (action.key === "rename") router.push("/device/rename-device");
                    else router.push("/device/pair-device");
                  }}
                  key={action.key}
                  activeOpacity={0.9}
                  style={themedStyles.actionRow}
                >
                  <View style={themedStyles.actionLabelRow}>
                    <View
                      style={[
                        themedStyles.actionIcon,
                        action.key === "dismiss" && { backgroundColor: "rgba(255,0,0,0.1)" },
                      ]}
                    >
                      {action.icon === "search" && (
                        <IconSearch stroke={theme.colors.slateCharcoal} />
                      )}
                      {action.icon === "refresh" && (
                        <IconRefresh stroke={theme.colors.slateCharcoal} />
                      )}
                      {action.icon === "pencil" && (
                        <IconRemane stroke={theme.colors.slateCharcoal} />
                      )}
                      {action.icon === "notifications-off" && (
                        <Ionicons
                          name="notifications-off"
                          size={moderateScale(16)}
                          color="#FF3B30"
                        />
                      )}
                    </View>
                    <ThemeText
                      variant="manrope.body1Bold"
                      style={[
                        themedStyles.actionLabel,
                        action.key === "dismiss" && { color: "#FF3B30" },
                      ]}
                    >
                      {t(`device.actions.${action.key}`)}
                    </ThemeText>
                  </View>
                  <View style={themedStyles.actionTrailing}>
                    {action.detail && (
                      <View style={themedStyles.actionBadge}>
                        <ThemeText variant="manrope.caption" style={themedStyles.actionBadgeText}>
                          {action.detail}
                        </ThemeText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ThemeView>

          {/* SCANNING OVERVIEW (Only when disconnected) */}
          {connectionStatus !== "connected" && (
            <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
              <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                {t(LocalizedStrings.device.avlDevices)}
              </ThemeText>

              {!isBluetoothEnabled ? (
                <View style={themedStyles.bluetoothOffContainer}>
                  <Ionicons
                    name="bluetooth-outline"
                    size={moderateScale(40)}
                    color={theme.colors.text.secondary}
                  />
                  <ThemeText variant="manrope.body1Bold" style={themedStyles.bluetoothOffText}>
                    {t(LocalizedStrings.device.bluetooth.alertMessage)}
                  </ThemeText>

                  <Button
                    fullWidth={false}
                    title={t(LocalizedStrings.device.scan.rescan ?? "Retry")}
                    textStyle={themedStyles.retryButtonText}
                    onPress={async () => {
                      try {
                        await initBLE();
                      } catch (error) {
                        alert.show(
                          AlertPresets.error(t(LocalizedStrings.common.error), error.message),
                        );
                      }
                    }}
                  />
                </View>
              ) : (
                <>
                  {isScanning && (
                    <ThemeText style={{ marginBottom: verticalScale(10) }}>
                      {t(LocalizedStrings.device.scan.scanning)}
                    </ThemeText>
                  )}
                  <FlatList
                    data={scannedDevices}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      !isScanning ? (
                        <View style={themedStyles.emptyDeviceContainer}>
                          <Ionicons
                            name="hardware-chip-outline"
                            size={moderateScale(48)}
                            color={theme.colors.text.secondary}
                          />
                          <ThemeText
                            variant="manrope.body1Bold"
                            style={themedStyles.emptyDeviceTitle}
                          >
                            {t(LocalizedStrings.device.scan.noDevices)}
                          </ThemeText>
                          <ThemeText
                            variant="manrope.caption"
                            style={themedStyles.emptyDeviceSubtitle}
                          >
                            {t(LocalizedStrings.device.tap_to_search)}
                          </ThemeText>

                          <Button
                            fullWidth={false}
                            title={t(LocalizedStrings.device.try_again)}
                            textStyle={themedStyles.retryButtonText}
                            onPress={async () => {
                              try {
                                await scanDevices();
                              } catch (error) {
                                alert.show(
                                  AlertPresets.error(
                                    t(LocalizedStrings.common.error),
                                    error.message,
                                  ),
                                );
                              }
                            }}
                          />
                        </View>
                      ) : null
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={themedStyles.actionRow}
                        onPress={() => handleConnectToDevice(item.id)}
                        disabled={connectionStatus !== "disconnected"}
                      >
                        <View style={themedStyles.actionLabelRow}>
                          <Ionicons name="bluetooth" size={moderateScale(18)} color="#0095FF" />
                          <View style={{ marginLeft: scale(10) }}>
                            <ThemeText variant="manrope.body1Bold">
                              {item.name || "Unnamed"}
                            </ThemeText>
                            <ThemeText variant="manrope.caption">
                              {t(LocalizedStrings.device.RSSI)}: {item.rssi}
                            </ThemeText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
            </ThemeView>
          )}
        </ScrollView>
      </SafeAreaScreen>
    </>
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
    },
    card: {
      marginTop: verticalScale(20),
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
    },
    cardTitle: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(16),
      fontWeight: "bold",
    },
    connectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    connectionHeaderTitle: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexShrink: 1,
    },
    disconnectButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: verticalScale(4),
      paddingHorizontal: theme.spacing.sm,
      borderRadius: moderateScale(6),
      backgroundColor: "rgba(255,59,48,0.1)",
      gap: moderateScale(4),
    },
    disconnectButtonText: {
      color: "#FF3B30",
    },
    connectionIcon: {
      aspectRatio: 1,
      height: verticalScale(24),
      borderRadius: moderateScale(4),
      backgroundColor: "rgba(0, 149, 255, 0.10)",
      justifyContent: "center",
      alignItems: "center",
    },
    connectionStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    connectionStat: {
      flex: 1,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.background.default,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      marginRight: theme.spacing.sm,
    },
    statLabel: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    statValue: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      textAlign: "center",
    },
    onlineText: { color: "#47D257" },
    warningText: { color: "#FF9800" },
    textWhite: { color: theme.colors.white, fontFamily: fontFamily.manrope.bold },
    textDark: { color: theme.colors.text.primary, fontFamily: fontFamily.manrope.medium },

    batteryWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      position: "relative",
    },
    batteryTrack: {
      flex: 1,
      height: verticalScale(16),
      borderRadius: moderateScale(5),
      backgroundColor: "rgba(0,0,0,0.08)",
      overflow: "hidden",
    },
    batteryFill: {
      height: "100%",
    },
    batteryText: {
      color: theme.colors.white,
      position: "absolute",
      textAlign: "center",
      width: "100%",
      fontSize: moderateScale(12),
    },

    settingLabel: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      color: theme.colors.text.secondary,
    },
    volumeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    volumeNode: {
      flex: 1,
      paddingVertical: verticalScale(8),
      marginHorizontal: scale(2),
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: moderateScale(6),
      alignItems: "center",
    },
    volumeNodeActive: {
      backgroundColor: theme.colors.primary.main,
    },
    toneContainer: {
      flexDirection: "row",
      gap: scale(8),
      paddingBottom: verticalScale(8),
    },
    toneNode: {
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(8),
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: moderateScale(20),
      alignItems: "center",
    },
    toneNodeActive: {
      backgroundColor: theme.colors.primary.main,
    },

    schedulesContainer: {
      flexDirection: "column",
      gap: theme.spacing.sm,
    },
    scheduleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: theme.spacing.sm,
      backgroundColor: "rgba(0, 149, 255, 0.05)",
      borderRadius: theme.spacing.sm,
    },
    scheduleDisabled: {
      backgroundColor: "rgba(0,0,0,0.03)",
      opacity: 0.6,
    },
    scheduleSwitch: {
      width: scale(46),
      height: verticalScale(26),
    },

    compartmentHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    compartmentRefreshButton: {
      padding: theme.spacing.xs,
    },
    compartmentHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    compartmentEraseButton: {
      paddingVertical: verticalScale(4),
      paddingHorizontal: theme.spacing.sm,
      borderRadius: moderateScale(6),
      backgroundColor: "rgba(255,59,48,0.1)",
    },
    compartmentEraseButtonText: {
      color: "#FF3B30",
      fontSize: moderateScale(11),
    },
    compartmentEmpty: {
      alignItems: "center",
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    compartmentEmptyText: {
      color: theme.colors.text.secondary,
      textAlign: "center",
    },
    compartmentLastRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.sm,
      backgroundColor: "rgba(0, 149, 255, 0.05)",
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    compartmentLastText: {
      marginLeft: scale(8),
    },
    compartmentList: {
      gap: theme.spacing.xs,
    },
    compartmentListItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
      paddingVertical: verticalScale(4),
    },
    compartmentListItemText: {
      color: theme.colors.text.secondary,
    },

    compartmentGrid: {
      gap: verticalScale(8),
      marginBottom: verticalScale(8),
    },
    compartmentGridRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
    },
    compartmentGridCell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: moderateScale(8),
      backgroundColor: "rgba(0,0,0,0.04)",
    },
    compartmentGridCellFilled: {
      backgroundColor: "rgba(0, 149, 255, 0.18)",
    },
    compartmentGridCellToday: {
      backgroundColor: "#FCE96A",
    },

    actionsList: {
      gap: theme.spacing.sm,
    },
    actionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: theme.spacing.smd,
      borderWidth: scale(1),
      borderColor: "rgba(0,0,0,0.08)",
      paddingHorizontal: theme.spacing.smd,
      paddingVertical: theme.spacing.smx,
      backgroundColor: "rgba(255,255,255,0.68)",
    },
    actionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    actionIcon: {
      aspectRatio: 1,
      height: verticalScale(32),
      borderRadius: moderateScale(8),
      backgroundColor: "rgba(0,0,0,0.03)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.smd,
    },
    actionLabel: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(14),
    },
    actionTrailing: {
      flexDirection: "row",
      alignItems: "center",
    },
    actionBadge: {
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(2),
      borderRadius: theme.spacing.xxxl,
      backgroundColor: theme.colors.primary.main,
    },
    actionBadgeText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(12),
    },

    bluetoothOffContainer: {
      alignItems: "center",
      paddingVertical: verticalScale(24),
      gap: verticalScale(12),
    },
    bluetoothOffText: {
      color: theme.colors.text.secondary,
      textAlign: "center",
      fontSize: moderateScale(13),
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
      backgroundColor: theme.colors.primary.main,
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
      borderRadius: 999,
      marginTop: verticalScale(4),
    },
    retryButtonText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(13),
    },

    emptyDeviceContainer: {
      alignItems: "center",
      paddingVertical: verticalScale(32),
      gap: verticalScale(10),
    },
    emptyDeviceTitle: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(15),
      textAlign: "center",
    },
    emptyDeviceSubtitle: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(12),
      textAlign: "center",
      paddingHorizontal: scale(16),
    },
  });