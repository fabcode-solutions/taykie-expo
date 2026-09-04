import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mmkvJSONStateStorage } from "./stateStorage";
// Module-level (not store state) since it's an opaque timer handle, not
// serializable UI state.
let devicePollInterval: ReturnType<typeof setInterval> | null = null;
// How long a tone/volume preview plays before auto-stopping. The device
// never auto-stops F4 on its own, so this is what keeps a settings-screen
// preview from playing indefinitely.
const PREVIEW_DURATION_MS = 2500;
// Tracks the pending "turn preview off" timer so tapping a new tone/volume
// cancels any earlier tap's still-pending off-timer — otherwise a stale
// timer from a previous tap can fire just after a new tap's "on" and cut
// the new preview off almost immediately.
let previewOffTimer: ReturnType<typeof setTimeout> | null = null;
// Tracks whether a preview is currently sounding on the device. Needed
// because switching tone/volume while one is already playing must send an
// explicit "off" for the current preview BEFORE sending the new "on" —
// the device doesn't cleanly cut over between two back-to-back "on" F4
// frames, so without this the previously-selected tone kept sounding
// alongside (or instead of) the newly selected one.
let activePreviewOn = false;
import {
  bleService,
  TaykieDevice,
  DeviceData,
  ScheduleSlot,
  HistoryRecord,
  CmdType,
} from "../services/ble/BLEService";
import { DEFAULT_TONE_INDEX, DEFAULT_VOLUME_LEVEL } from "../utils/toneAudio";
import {
  pairDevice,
  unpairDevice,
  updateBLEState,
  UpdateBLEStateRequest,
  startHistorySyncApi,
  uploadHistoryBatch,
  completeSyncSession,
} from "@/services/api/device";

interface BLEState {
  // Scanning state
  isScanning: boolean;
  scannedDevices: TaykieDevice[];

  // Connection state
  connectedDevice: TaykieDevice | null;
  connectionStatus: "connected" | "disconnected" | "connecting";

  // Device data (Updated for Taykie Spec)
  deviceData: Partial<DeviceData> | null;
  // Last known numeric percentage. The device reports 0xFF instead of a
  // percentage while charging, so this holds the last real reading rather
  // than being wiped out — isCharging is tracked separately.
  batteryLevel: number | null;
  isCharging: boolean;
  // Locally tracked from the user's last selection, not read back from the
  // device — the protocol has no "current tone/volume" query.
  toneIndex: number | null;
  volumeLevel: number | null;
  schedules: ScheduleSlot[];
  // Compartment activity from the F6 history query, most recent first. The
  // protocol's history record has no open/closed flag — just a timestamp —
  // so these are shown as "accessed" events rather than open/close state.
  historyRecords: HistoryRecord[];
  // Timestamp of the last successful F3 status reply — a real, verifiable
  // "we actually heard from the device at this time" signal (distinct from
  // the polling interval, which fires whether or not the device answers).
  lastSyncedAt: string | null;

  // Permissions
  hasPermissions: boolean;
  isBluetoothEnabled: boolean;

  // Actions (state setters)
  setScanning: (isScanning: boolean) => void;
  clearScannedDevices: () => void;

  isSyncingHistory: boolean;
  historyTotal: number;
  historyProgress: number;
  syncSessionId: string | null;
}

interface BLEAction {
  // BLE Base Actions
  initBLE: () => Promise<void>;
  scanDevices: () => Promise<void>;
  stopScan: () => Promise<void>;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  forgetDevice: () => Promise<void>; // Added to handle unpairing from backend

  // Taykie Specific Commands
  queryDeviceStatus: () => Promise<void>;
  dismissAlert: () => Promise<void>;
  setDeviceVolume: (volumeLevel: number) => Promise<void>;
  setDeviceTone: (toneIndex: number) => Promise<void>;
  toggleScheduleSlot: (index: number) => Promise<void>;
  startHistorySync: () => Promise<void>;
  // Lightweight compartment-activity refresh: queries the device directly
  // without requiring a backend sync session, for on-screen display.
  refreshCompartmentActivity: () => Promise<void>;
  // Destructive: wipes the device's history. See implementation comment.
  eraseHistory: () => Promise<void>;
  renameDevice: (name: string) => Promise<void>;

  reset: () => void;
}

const initialState = {
  isScanning: false,
  scannedDevices: [],
  connectedDevice: null,
  connectionStatus: "disconnected" as const,
  deviceData: null,

  // Taykie specific state
  batteryLevel: null,
  isCharging: false,
  toneIndex: null,
  volumeLevel: null,
  schedules: [],
  historyRecords: [],
  lastSyncedAt: null,

  hasPermissions: false,
  isBluetoothEnabled: false,

  isSyncingHistory: false,
  historyTotal: 0,
  historyProgress: 0,
  syncSessionId: null,
};

export const useBLEStore = create<BLEState & BLEAction>()(
  persist(
    (set, get) => ({
  ...initialState,

  // ----------------------
  // BASIC SETTERS
  // ----------------------
  setScanning: (isScanning) => set({ isScanning }),
  clearScannedDevices: () => set({ scannedDevices: [] }),

  // ----------------------
  // INIT (Permissions + Global Listeners)
  // ----------------------
  initBLE: async () => {
    try {
      // 1. Check Permissions
      const hasPermissions = await bleService.requestPermissions();
      const isBluetoothEnabled = await bleService.isBluetoothEnabled();

      set({ hasPermissions, isBluetoothEnabled });

      // 2. Bind the global status listener from the service.
      // Fires whenever the device replies to a query-status (F3) command.
      bleService.onStatusUpdated = async (status) => {
        set((state) => {
          // 0xFF means "currently charging" instead of a percentage — keep
          // showing the last known reading rather than losing it.
          const isCharging = status.batteryLevel === 0xff;
          const batteryLevel = isCharging
            ? state.batteryLevel
            : (status.batteryLevel ?? state.batteryLevel);

          return {
            deviceData: { ...state.deviceData, ...status },
            batteryLevel,
            isCharging,
            schedules: status.schedules ?? state.schedules,
            lastSyncedAt: new Date().toISOString(),
          };
        });

        const currentDeviceId = get().connectedDevice?.id;
        if (currentDeviceId) {
          // Use the resolved (non-0xFF) reading so the backend never
          // receives the "charging" sentinel value as a battery percentage.
          const requestBody: UpdateBLEStateRequest = {
            batteryLevel: get().batteryLevel ?? 0,
            firmwareVersion: "",
            bleSchedules: (status.schedules ?? []).map((slot) => ({
              enabled: slot.enabled,
              daysBitmask: slot.weekdayBitmask,
              hour: slot.hour,
              minute: slot.minute,
            })),
          };
          await updateBLEState(currentDeviceId, requestBody);
        }
      };

      // History records arrive as a single reply to the F6 query — this
      // protocol has no batching, sequence numbers, or ack/retransmit
      // handshake, so we upload everything we got and close the session.
      bleService.onHistoryReceived = async (records) => {
        // Always surface what the device returned, regardless of whether a
        // backend sync session is active — the on-screen activity list
        // shouldn't depend on backend availability.
        const sorted = [...records].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        set({ historyRecords: sorted });

        const { connectedDevice, syncSessionId } = get();
        if (!connectedDevice?.id || !syncSessionId) {
          // No backend sync in progress (e.g. a lightweight on-screen
          // refresh) — nothing further to do.
          return;
        }

        try {
          set({ historyTotal: records.length, historyProgress: 0 });

          if (records.length > 0) {
            // NOTE: the device protocol has no per-record sequence number,
            // so this is a session-local index, not a stable device-side
            // id — dedup on the backend should key off the timestamp until
            // the factory clarifies a real identifier.
            const mappedRecords = records.map((r, index) => ({
              sequenceNumber: index,
              eventAt: r.timestamp,
            }));

            await uploadHistoryBatch({
              deviceId: connectedDevice.id,
              sessionId: syncSessionId,
              records: mappedRecords,
            });

            console.log("Backend saved", records.length, "history records");
          }

          set({ historyProgress: records.length });

          await completeSyncSession({
            deviceId: connectedDevice.id,
            sessionId: syncSessionId,
            status: "completed",
          });
          set({ isSyncingHistory: false, syncSessionId: null });
        } catch (error) {
          console.error("Failed to save history records:", error);
          set({ isSyncingHistory: false, syncSessionId: null });
        }
      };

      // Fires on both a user-initiated disconnect and an unexpected link
      // drop — either way the last-known device data is now stale, so
      // clear it rather than leaving the UI showing a frozen snapshot.
      bleService.onDeviceDisconnected = () => {
        if (devicePollInterval) {
          clearInterval(devicePollInterval);
          devicePollInterval = null;
        }
        if (previewOffTimer) {
          clearTimeout(previewOffTimer);
          previewOffTimer = null;
        }
        activePreviewOn = false;
        set({
          connectedDevice: null,
          connectionStatus: "disconnected",
          deviceData: null,
          batteryLevel: null,
          isCharging: false,
          // toneIndex/volumeLevel are NOT live device telemetry — they're
          // the user's own persisted preference (see the store's `persist`
          // config below). Clearing them here on every disconnect wiped out
          // "previously set" tone/volume each time the device dropped, even
          // though they're meant to survive across sessions.
          schedules: [],
          historyRecords: [],
          lastSyncedAt: null,
          isSyncingHistory: false,
          historyTotal: 0,
          historyProgress: 0,
          syncSessionId: null,
        });
      };
    } catch (error) {
      console.error("BLE init error:", error);
    }
  },

  // ----------------------
  // SCAN
  // ----------------------
  scanDevices: async () => {
    set({ isScanning: true, scannedDevices: [] });

    try {
      await bleService.startScan((device) => {
        set((state) => {
          const exists = state.scannedDevices.some((d) => d.id === device.id);

          if (exists) {
            return {
              scannedDevices: state.scannedDevices.map((d) => (d.id === device.id ? device : d)),
              // Removed isScanning: false here to prevent UI flash
            };
          }

          return {
            scannedDevices: [...state.scannedDevices, device],
            // Removed isScanning: false here to prevent UI flash
          };
        });
      });

      // Turn off scanner UI after 10 seconds
      setTimeout(() => {
        set({ isScanning: false });
      }, 10000);
    } catch (error) {
      console.error("Scan error:", error);
      set({ isScanning: false });
    }

    // ❌ DO NOT ADD A FINALLY BLOCK HERE!
  },

  stopScan: async () => {
    await bleService.stopScan();
    set({ isScanning: false });
  },

  // ----------------------
  // CONNECT
  // ----------------------
  connectToDevice: async (deviceId: string) => {
    set({ connectionStatus: "connecting" });
    try {
      const device = await bleService.connectToDevice(deviceId);

      // Note: BLEService automatically handles password verification, time
      // sync, and an initial status query immediately upon connection.

      set({
        connectedDevice: {
          id: device.id,
          name: device.name,
          rssi: 0,
          isConnected: true,
        },
        connectionStatus: "connected",
      });

      // The device doesn't push updates in real time (compartment events
      // are only logged, not streamed) — poll status + history periodically
      // so battery, schedules, and lid activity don't go stale until the
      // next manual refresh or reconnect.
      if (devicePollInterval) clearInterval(devicePollInterval);
      let isPolling = false;
      devicePollInterval = setInterval(async () => {
        if (isPolling) return;
        isPolling = true;
        try {
          // queryStatus/queryHistory each re-verify the password first
          // internally (see BLEService.ensurePasswordVerified) — devices
          // were seen rejecting F3/F6 with genuine (checksum-valid) "bad
          // checksum" NACKs a few seconds into a poll cycle, consistent
          // with the device expecting a fresh E0 before each command
          // rather than just once at initial connect.
          //
          // Waits for each actual reply rather than a guessed delay — F3's
          // 106-byte reply arrives across several BLE packets, and firing
          // the next command before it's fully reassembled corrupts both
          // replies (see BLEService.waitForReply).
          await bleService.queryStatus();
          await bleService.waitForReply(CmdType.QueryStatus);
          await bleService.queryHistory();
          await bleService.waitForReply(CmdType.QueryHistory);
        } catch (error) {
          console.warn("Device poll failed:", error);
        } finally {
          isPolling = false;
        }
      }, 15000);

      // Backend pairing is best-effort: the BLE link is already live at this
      // point, so a failure here (network, backend) must not roll back the
      // connection state back to "disconnected" — that would desync the UI
      // from the still-active BLE connection and force a needless reconnect.
      try {
        await pairDevice({ name: device.name || "Taykie Pill Box", blePeripheralId: device.id });
      } catch (pairError) {
        console.warn("Backend device pairing failed (BLE connection still active):", pairError);
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      set({ connectionStatus: "disconnected" });
      const errorMessage = error?.message || "An unknown connection error occurred";
      throw new Error(errorMessage);
    }
  },

  // ----------------------
  // DISCONNECT / UNPAIR
  // ----------------------
  disconnectDevice: async () => {
    try {
      await bleService.disconnect();
      set({
        connectedDevice: null,
        connectionStatus: "disconnected",
      });
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  },

  forgetDevice: async () => {
    try {
      const deviceId = get().connectedDevice?.id;
      if (deviceId) {
        await unpairDevice(deviceId); // Delete from backend
        await bleService.disconnect(); // Disconnect Bluetooth
        set({
          connectedDevice: null,
          connectionStatus: "disconnected",
        });
      }
    } catch (error) {
      console.error("Forget device error:", error);
    }
  },

  // ----------------------
  // TAYKIE COMMANDS
  // ----------------------
  queryDeviceStatus: async () => {
    try {
      await bleService.queryStatus();
    } catch (error) {
      console.error("Failed to query status:", error);
    }
  },

  dismissAlert: async () => {
    try {
      await bleService.dismissAlert();
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  },

  // Volume and tone are sent together in a single sound-control frame, so
  // each setter re-sends the other's last known value alongside its own.
  // These are previews (the user browsing tone/volume options), not a real
  // reminder — play briefly then auto-stop, rather than leaving the sound on
  // indefinitely. The device itself never auto-stops an F4 trigger (see
  // BLEService.triggerSound), so without this it would play until something
  // explicitly turns it off.
  setDeviceVolume: async (volumeLevel: number) => {
    try {
      set({ volumeLevel });
      // Nullish coalescing, not || — an explicit Mute tone (0) must stay 0,
      // not get silently overridden with a fallback "real" tone the user
      // never picked. Unset (null) still resolves to Mute (see
      // DEFAULT_TONE_INDEX), which is the correct default now too.
      const toneIndex = get().toneIndex ?? DEFAULT_TONE_INDEX;
      // Only actually play if BOTH tone and volume are non-Mute — an
      // explicit Mute on either axis means no sound, regardless of which
      // one the user is currently adjusting.
      const shouldPlay = toneIndex > 0 && volumeLevel > 0;

      if (previewOffTimer) clearTimeout(previewOffTimer);
      // Stop whatever's currently sounding before starting the new preview
      // — sending a fresh "on" without an explicit "off" first left the
      // previous tone/volume still playing on the device.
      if (activePreviewOn) {
        await bleService.triggerSound(false, toneIndex, volumeLevel).catch(() => {});
        activePreviewOn = false;
      }
      await bleService.triggerSound(shouldPlay, toneIndex, volumeLevel);
      if (shouldPlay) {
        activePreviewOn = true;
        previewOffTimer = setTimeout(() => {
          bleService.triggerSound(false, toneIndex, volumeLevel).catch(() => {});
          activePreviewOn = false;
        }, PREVIEW_DURATION_MS);
      }
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  },

  setDeviceTone: async (toneIndex: number) => {
    try {
      set({ toneIndex });
      // Nullish coalescing, not || — an explicit Mute volume (0) must stay
      // 0, not get silently overridden back up to an audible default. This
      // was the direct cause of sound still playing on a tone change even
      // when volume was set to Mute.
      const volumeLevel = get().volumeLevel ?? DEFAULT_VOLUME_LEVEL;
      // Only actually play if BOTH tone and volume are non-Mute.
      const shouldPlay = toneIndex > 0 && volumeLevel > 0;

      if (previewOffTimer) clearTimeout(previewOffTimer);
      // Stop whatever's currently sounding before starting the new preview
      // — same reasoning as setDeviceVolume above.
      if (activePreviewOn) {
        await bleService.triggerSound(false, toneIndex, volumeLevel).catch(() => {});
        activePreviewOn = false;
      }
      await bleService.triggerSound(shouldPlay, toneIndex, volumeLevel);
      if (shouldPlay) {
        activePreviewOn = true;
        previewOffTimer = setTimeout(() => {
          bleService.triggerSound(false, toneIndex, volumeLevel).catch(() => {});
          activePreviewOn = false;
        }, PREVIEW_DURATION_MS);
      }
    } catch (error) {
      console.error("Failed to set tone:", error);
    }
  },

  // F2 replaces the device's *entire* schedule in one frame — there's no
  // per-slot update command — so this flips one slot's enabled bit within
  // the current 10-slot array and re-sends the whole thing.
  toggleScheduleSlot: async (index: number) => {
    const currentSchedules = get().schedules;
    const targetSlot = currentSchedules[index];
    if (!targetSlot) return;

    const previousSchedules = currentSchedules;
    const updatedSchedules = currentSchedules.map((slot, i) =>
      i === index ? { ...slot, enabled: !slot.enabled } : slot,
    );

    // Optimistic update so the toggle feels immediate; queryStatus below
    // reconciles with what the device actually accepted.
    set({ schedules: updatedSchedules });

    try {
      await bleService.setSchedule(updatedSchedules);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await bleService.queryStatus();
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
      set({ schedules: previousSchedules });
    }
  },

  startHistorySync: async () => {
    try {
      const currentDeviceId = get().connectedDevice?.id;
      if (!currentDeviceId) throw new Error("No active device connected.");

      set({ isSyncingHistory: true, historyProgress: 0, historyTotal: 0 });

      // Tell backend we are starting a sync to get a session ID
      const response = await startHistorySyncApi(currentDeviceId);
      const sessionId =
        response?.sessionId || response?.data?.id || response?.data?.sessionId || response?.id;

      if (!sessionId) throw new Error("Backend did not return a valid Sync Session ID");

      set({ syncSessionId: sessionId });

      // Ask the device for its stored history; the reply is handled by
      // bleService.onHistoryReceived above.
      await bleService.queryHistory();
    } catch (error) {
      console.error("Failed to start history sync:", error);
      set({ isSyncingHistory: false, syncSessionId: null });
    }
  },

  refreshCompartmentActivity: async () => {
    try {
      const currentDeviceId = get().connectedDevice?.id;
      if (!currentDeviceId) throw new Error("No active device connected.");
      // No backend session set here — onHistoryReceived above still
      // populates historyRecords for the UI, it just skips the upload path.
      await bleService.queryHistory();
    } catch (error) {
      console.error("Failed to refresh compartment activity:", error);
    }
  },

  // Destructive — wipes the device's stored history (F6/FF is literally
  // "erase flash" per the protocol). Only for the controlled test used to
  // reverse-engineer the F6 reply's real byte layout: erase, do exactly one
  // physical open/close, then query history so the reply is short enough to
  // decode unambiguously. Requires explicit UI confirmation before calling.
  eraseHistory: async () => {
    const currentDeviceId = get().connectedDevice?.id;
    if (!currentDeviceId) throw new Error("No active device connected.");
    await bleService.eraseHistoryFlash();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await bleService.queryHistory();
  },

  // There's no "set device name" command in the BLE protocol, so the name
  // is purely a backend/app-side label — renaming re-pairs the same
  // blePeripheralId with a new name, which the backend treats as an update.
  renameDevice: async (name: string) => {
    const device = get().connectedDevice;
    if (!device) throw new Error("No active device connected.");

    const trimmed = name.trim();
    if (!trimmed) throw new Error("Device name can't be empty.");

    await pairDevice({ name: trimmed, blePeripheralId: device.id });
    set({ connectedDevice: { ...device, name: trimmed } });
  },

  // ----------------------
  // RESET
  // ----------------------
  reset: () => {
    if (devicePollInterval) {
      clearInterval(devicePollInterval);
      devicePollInterval = null;
    }
    if (previewOffTimer) {
      clearTimeout(previewOffTimer);
      previewOffTimer = null;
    }
    activePreviewOn = false;
    set(initialState);
  },
    }),
    {
      name: "ble-store",
      storage: mmkvJSONStateStorage,
      // Only the user's tone/volume preference survives a restart — every
      // other field (connection state, battery, schedules, history, ...) is
      // live device data that would just be stale/wrong if persisted.
      partialize: (state) => ({
        toneIndex: state.toneIndex,
        volumeLevel: state.volumeLevel,
      }),
    },
  ),
);

// ----------------------
// SELECTOR HOOKS
// ----------------------

export function useBLEScanning() {
  const isScanning = useBLEStore((s) => s.isScanning);
  const scannedDevices = useBLEStore((s) => s.scannedDevices);

  return { isScanning, scannedDevices };
}

export function useBLEConnection() {
  const connectedDevice = useBLEStore((s) => s.connectedDevice);
  const connectionStatus = useBLEStore((s) => s.connectionStatus);

  return { connectedDevice, connectionStatus };
}

export function useBLEDeviceData() {
  const batteryLevel = useBLEStore((s) => s.batteryLevel);
  const isCharging = useBLEStore((s) => s.isCharging);
  const toneIndex = useBLEStore((s) => s.toneIndex);
  const volumeLevel = useBLEStore((s) => s.volumeLevel);
  const schedules = useBLEStore((s) => s.schedules);
  const lastSyncedAt = useBLEStore((s) => s.lastSyncedAt);

  return { batteryLevel, isCharging, toneIndex, volumeLevel, schedules, lastSyncedAt };
}

export function useBLECompartments() {
  const historyRecords = useBLEStore((s) => s.historyRecords);
  const refreshCompartmentActivity = useBLEStore((s) => s.refreshCompartmentActivity);

  return { historyRecords, refreshCompartmentActivity };
}

export function useBLEPermissions() {
  const hasPermissions = useBLEStore((s) => s.hasPermissions);
  const isBluetoothEnabled = useBLEStore((s) => s.isBluetoothEnabled);

  return { hasPermissions, isBluetoothEnabled };
}