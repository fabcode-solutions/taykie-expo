import { create } from "zustand";
import { bleService, TaykieDevice, DeviceData } from "../services/ble/BLEService";
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
  batteryLevel: number | null;
  lidState: "open" | "closed" | null;
  toneIndex: number | null;
  volumeLevel: number | null;
  schedules: any[];

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
  startHistorySync: () => Promise<void>;

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
  lidState: null,
  toneIndex: null,
  volumeLevel: null,
  schedules: [],

  hasPermissions: false,
  isBluetoothEnabled: false,

  isSyncingHistory: false,
  historyTotal: 0,
  historyProgress: 0,
  syncSessionId: null,
};

export const useBLEStore = create<BLEState & BLEAction>((set, get) => ({
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

      // 2. Bind the global status listener from the service
      // Whenever the device sends a 0x00 (Status) or 0x05 (Schedule) response,
      // this callback fires and updates the Zustand store automatically.
      bleService.onStatusUpdated = async (status) => {
        set((state) => ({
          deviceData: { ...state.deviceData, ...status },
          batteryLevel: status.batteryLevel ?? state.batteryLevel,
          lidState: status.lidState ?? state.lidState,
          toneIndex: status.toneIndex ?? state.toneIndex,
          volumeLevel: status.volumeLevel ?? state.volumeLevel,
          schedules: status.schedules ?? state.schedules,
        }));

        if (status) {
          const currentDeviceId = get().connectedDevice?.id;
          if (currentDeviceId) {
            const requestBody: UpdateBLEStateRequest = {
              batteryLevel: status.batteryLevel ?? 0,
              lidState: status.lidState === "open", // Map "open"/"closed" to boolean
              alertToneIndex: status.toneIndex ?? 0,
              alertVolume: status.volumeLevel ?? 0,
              firmwareVersion: "",
              bleSchedules: status.schedules,
            };
            await updateBLEState(currentDeviceId, requestBody); // Use real ID instead of ""
          }
        }
      };

      // 1. Listen for the Total Count
      bleService.onHistoryCountReceived = async (totalRecords) => {
        set({ isSyncingHistory: true, historyTotal: totalRecords, historyProgress: 0 });

        if (totalRecords === 0) {
          // Immediately complete session if device has no records
          const { connectedDevice, syncSessionId } = get();
          if (connectedDevice?.id && syncSessionId) {
            await completeSyncSession({
              deviceId: connectedDevice.id,
              sessionId: syncSessionId,
              status: "completed",
            });
          }
          set({ isSyncingHistory: false, syncSessionId: null }); // Nothing to sync
        }
      };

      // 2. Listen for Batches and SAVE BEFORE ACKING
      bleService.onHistoryBatchReceived = async (records, isValid) => {
        if (!isValid) {
          // Checksum failed, request retransmit (0xFFFF)
          await bleService.ackHistoryBatch(0xffff);
          return;
        }

        try {
          const { connectedDevice, syncSessionId, historyTotal, historyProgress } = get();

          if (!connectedDevice?.id || !syncSessionId) {
            throw new Error("Missing active device ID or backend sync session ID.");
          }

          // Map BLE parsed format to Backend API format
          const mappedRecords = records.map((r: any) => ({
            sequenceNumber: r.sequenceNumber,
            eventAt: r.timestamp,
          }));

          // CRITICAL SAFEGUARD: Persist to backend API *HERE*
          await uploadHistoryBatch({
            deviceId: connectedDevice.id,
            sessionId: syncSessionId,
            records: mappedRecords,
          });

          console.log("Backend saved batch of", records.length, "records");

          const highestSeqNo = records[records.length - 1].sequenceNumber;

          // Update progress UI
          const newProgress = historyProgress + records.length;
          set({ historyProgress: newProgress });

          // Now it is safe to ACK the device (which will trigger deletion on device)
          await bleService.ackHistoryBatch(highestSeqNo);

          // If we reached the end, finish sync
          if (newProgress >= historyTotal) {
            await completeSyncSession({
              deviceId: connectedDevice.id,
              sessionId: syncSessionId,
              status: "completed",
            });
            set({ isSyncingHistory: false, syncSessionId: null });
            // Push to cloud/backend here (already handled above)
          }
        } catch (error) {
          console.error(
            "Failed to save records locally. Aborting ACK to prevent data loss.",
            error,
          );
          // We DO NOT ACK here. The device will automatically retransmit,
          // or time out, saving the records on the device so they aren't lost.
        }
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
      if (device) {
        await pairDevice({ name: device.name || "Taykie Pill Box", blePeripheralId: device.id });
      }

      // Note: The new BLEService automatically handles sending the Set Time (0x07)
      // and Query Status (0x00) commands immediately upon connection.

      set({
        connectedDevice: {
          id: device.id,
          name: device.name,
          rssi: 0,
          isConnected: true,
        },
        connectionStatus: "connected",
      });
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

  setDeviceVolume: async (volumeLevel: number) => {
    try {
      await bleService.setVolume(volumeLevel);
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  },

  setDeviceTone: async (toneIndex: number) => {
    try {
      await bleService.setTone(toneIndex);
    } catch (error) {
      console.error("Failed to set tone:", error);
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

      // Tell BLE device to start transmitting
      await bleService.startHistorySync();
    } catch (error) {
      console.error("Failed to start history sync:", error);
      set({ isSyncingHistory: false, syncSessionId: null });
    }
  },

  // ----------------------
  // RESET
  // ----------------------
  reset: () => {
    set(initialState);
  },
}));

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
  const lidState = useBLEStore((s) => s.lidState);
  const toneIndex = useBLEStore((s) => s.toneIndex);
  const volumeLevel = useBLEStore((s) => s.volumeLevel);
  const schedules = useBLEStore((s) => s.schedules);

  return { batteryLevel, lidState, toneIndex, volumeLevel, schedules };
}

export function useBLEPermissions() {
  const hasPermissions = useBLEStore((s) => s.hasPermissions);
  const isBluetoothEnabled = useBLEStore((s) => s.isBluetoothEnabled);

  return { hasPermissions, isBluetoothEnabled };
}
