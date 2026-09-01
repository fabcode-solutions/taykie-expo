import { bleService, TaykieDevice, DeviceData } from "./BLEService";

/**
 * BLE Repository
 *
 * Provides a consistent API-like interface for BLE operations
 * Follows the same pattern as other repositories in the app
 *
 * Usage:
 * ```ts
 * import { bleRepository } from '@/services/ble/bleRepository';
 *
 * // Scan for devices
 * const devices = await bleRepository.scanForDevices();
 *
 * // Connect to device
 * await bleRepository.connectToDevice(deviceId);
 *
 * // Read device data
 * const data = await bleRepository.getDeviceData();
 * ```
 */
export const bleRepository = {
  /**
   * Check if Bluetooth permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      return await bleService.requestPermissions();
    } catch (error) {
      console.error("Error checking BLE permissions:", error);
      return false;
    }
  },

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    try {
      return await bleService.isBluetoothEnabled();
    } catch (error) {
      console.error("Error checking Bluetooth state:", error);
      return false;
    }
  },

  /**
   * Scan for nearby Taykie devices
   * @param timeoutMs - Scan duration in milliseconds
   * @returns Promise that resolves with array of found devices
   */
  async scanForDevices(timeoutMs: number = 10000): Promise<TaykieDevice[]> {
    const foundDevices: TaykieDevice[] = [];
    const deviceIds = new Set<string>();

    return new Promise((resolve, reject) => {
      bleService
        .startScan((device) => {
          // Prevent duplicates
          if (!deviceIds.has(device.id)) {
            deviceIds.add(device.id);
            foundDevices.push(device);
          }
        }, timeoutMs)
        .then(() => {
          console.log("foundDevices", foundDevices);
          // Wait for scan to complete
          setTimeout(() => {
            resolve(foundDevices);
          }, timeoutMs + 100);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  /**
   * Stop device scanning
   */
  async stopScan(): Promise<void> {
    await bleService.stopScan();
  },

  /**
   * Connect to a Taykie device
   * @param deviceId - Device ID to connect
   */
  async connectToDevice(deviceId: string): Promise<{
    success: boolean;
    message?: string;
    data?: DeviceData;
  }> {
    try {
      await bleService.connectToDevice(deviceId);

      // Read initial device data
      const data = await bleService.readAllDeviceData();

      return {
        success: true,
        message: "Device connected successfully",
        data,
      };
    } catch (error) {
      console.error("Connection error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  },

  /**
   * Disconnect from current device
   */
  async disconnectDevice(): Promise<{ success: boolean; message?: string }> {
    try {
      await bleService.disconnect();
      return {
        success: true,
        message: "Device disconnected successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Disconnect failed",
      };
    }
  },

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return bleService.isConnected();
  },

  /**
   * Get current device connection status
   */
  getConnectionStatus(): "connected" | "disconnected" {
    return bleService.isConnected() ? "connected" : "disconnected";
  },

  /**
   * Read all device data
   */
  async getDeviceData(): Promise<DeviceData> {
    try {
      return await bleService.readAllDeviceData();
    } catch (error) {
      console.error("Error reading device data:", error);
      return {
        batteryLevel: null,
        firmwareVersion: null,
        compartmentStatus: null,
        lastSync: null,
        connectionStatus: "disconnected",
      };
    }
  },

  /**
   * Read battery level
   */
  async getBatteryLevel(): Promise<number | null> {
    try {
      return await bleService.readBatteryLevel();
    } catch (error) {
      console.error("Error reading battery:", error);
      return null;
    }
  },

  /**
   * Read firmware version
   */
  async getFirmwareVersion(): Promise<string | null> {
    try {
      return await bleService.readFirmwareVersion();
    } catch (error) {
      console.error("Error reading firmware:", error);
      return null;
    }
  },

  /**
   * Read compartment status
   */
  async getCompartmentStatus(): Promise<number[] | null> {
    try {
      return await bleService.readCompartmentStatus();
    } catch (error) {
      console.error("Error reading compartments:", error);
      return null;
    }
  },

  /**
   * Read last sync time
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      return await bleService.readLastSync();
    } catch (error) {
      console.error("Error reading last sync:", error);
      return null;
    }
  },

  /**
   * Rename device
   * @param newName - New device name
   */
  async renameDevice(newName: string): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await bleService.writeDeviceName(newName);
      return {
        success,
        message: success ? "Device renamed successfully" : "Failed to rename device",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Rename failed",
      };
    }
  },

  /**
   * Trigger firmware update
   */
  async updateFirmware(): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await bleService.triggerFirmwareUpdate();
      return {
        success,
        message: success ? "Firmware update initiated" : "Failed to start firmware update",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Update failed",
      };
    }
  },

  /**
   * Subscribe to battery level changes
   * @param callback - Function to call when battery level changes
   * @returns Unsubscribe function
   */
  async subscribeToBattery(callback: (level: number) => void): Promise<() => void> {
    return await bleService.subscribeToBatteryLevel(callback);
  },

  /**
   * Subscribe to compartment status changes
   * @param callback - Function to call when compartment status changes
   * @returns Unsubscribe function
   */
  async subscribeToCompartments(callback: (status: number[]) => void): Promise<() => void> {
    return await bleService.subscribeToCompartmentStatus(callback);
  },
};
