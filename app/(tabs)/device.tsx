"use client";

import React, { useCallback, useEffect, useRef } from "react";
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
} from "@/stores/bleStore";
import { Loader } from "@/components/shared/loader";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { Audio } from "expo-av";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { Button } from "@/components/ui/button";

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

const TONE_OPTIONS = [
  { label: "Mute", value: 0 },
  { label: "Taykie", value: 1 },
  { label: "Verve", value: 2 },
  { label: "Echo", value: 3 },
  { label: "Pulse", value: 4 },
  { label: "Nudge", value: 5 },
  { label: "Shift", value: 6 },
];

export default function DeviceScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  // Store selectors
  const { isScanning, scannedDevices } = useBLEScanning();
  const { connectionStatus } = useBLEConnection();
  const { batteryLevel, lidState, toneIndex, volumeLevel, schedules } = useBLEDeviceData();

  const {
    scanDevices,
    stopScan,
    connectToDevice,
    initBLE,
    startHistorySync,
    dismissAlert,
    setDeviceVolume,
    setDeviceTone,
  } = useBLEStore();
  const { hasPermissions, isBluetoothEnabled } = useBLEPermissions();

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

  // Format Battery (0xFF / 255 means charging per spec)
  const isCharging = batteryLevel === 255;
  const displayBattery = isCharging
    ? "Charging"
    : batteryLevel !== null
      ? `${batteryLevel}%`
      : "--%";
  const batteryWidth = isCharging ? "100%" : batteryLevel ? `${batteryLevel}%` : "0%";

  const CONNECTION_STATS = [
    {
      key: "status",
      label: "Connection",
      value: connectionStatus === "connected" ? "Online" : "Offline",
      icon: "bluetooth",
    },
    {
      key: "battery",
      label: "Battery",
      value: displayBattery,
      icon: isCharging ? "battery-charging" : "battery-full",
    },
    {
      key: "lid",
      label: "Lid State",
      value: lidState === "open" ? "Open" : lidState === "closed" ? "Closed" : "--",
      icon: "scan",
    },
  ] as const;

  // Helper to parse day bitmask
  const formatDays = (bitmask: number) => {
    if (bitmask === 0x7f) return "Every day";
    if (bitmask === 0x1f) return "Weekdays";
    if (bitmask === 0x60) return "Weekends";
    if (bitmask === 0x00) return "No days";

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const active = days.filter((_, i) => bitmask & (1 << i));
    return active.join(", ");
  };

  const handleConnectToDevice = useCallback(async (deviceId: string) => {
    try {
      await connectToDevice(deviceId);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  async function playSoundPreview(toneLabel: string) {
    if (currentSoundRef.current) {
      await currentSoundRef.current.stopAsync();
      await currentSoundRef.current.unloadAsync();
    }
    let soundFile;

    switch (toneLabel) {
      case "Taykie":
        soundFile = require("../../assets/audio/Taykie.wav");
        break;
      case "Verve":
        soundFile = require("../../assets/audio/Verve.wav");
        break;
      case "Echo":
        soundFile = require("../../assets/audio/Echo.wav");
        break;
      case "Pulse":
        soundFile = require("../../assets/audio/Pulse.wav");
        break;
      case "Nudge":
        soundFile = require("../../assets/audio/Nudge.wav");
        break;
      case "Shift":
        soundFile = require("../../assets/audio/Shift.wav");
        break;
      default:
        return; // Mute
    }

    if (soundFile) {
      try {
        // 1. Ensure audio plays even if the phone is on silent/vibrate
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // 2. CRITICAL: Use the { sound } curly braces here to destructure
        const { sound } = await Audio.Sound.createAsync(soundFile);

        console.log("Playing sound for:", sound);
        await sound.playAsync();

        // 3. Clean up memory after it finishes
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (error) {
        console.error("Failed to play sound:", error);
      }
    }
  }

  return (
    <>
      {connectionStatus === "connecting" && <Loader />}
      <SafeAreaScreen withBackground={false} style={themedStyles.screen} edges={["top"]}>
        <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={themedStyles.contentContainer}
        >
          <AppHeader />

          {/* CONNECTION & HARDWARE STATUS CARD */}
          <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white} rounded="lg">
            <View style={themedStyles.connectionHeader}>
              <View style={themedStyles.connectionIcon}>
                <Ionicons name="bluetooth" size={moderateScale(16)} color={"#0095FF"} />
              </View>
              <ThemeText variant="manrope.h4" style={themedStyles.cardTitle}>
                {t(LocalizedStrings.device.connection.title)}
              </ThemeText>
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
                        stat.value === "Open" && themedStyles.warningText,
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
                    onPress={() => setDeviceVolume(level)}
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
                    onPress={() => setDeviceTone(tone.value)}
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
                        {formatDays(schedule.daysBitmask)}
                      </ThemeText>
                    </View>
                    <View style={themedStyles.scheduleBadge}>
                      <ThemeText
                        variant="manrope.caption"
                        style={schedule.enabled ? themedStyles.onlineText : themedStyles.textDark}
                      >
                        {schedule.enabled ? "ON" : "OFF"}
                      </ThemeText>
                    </View>
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
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
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
    scheduleBadge: {
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(4),
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: moderateScale(12),
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
