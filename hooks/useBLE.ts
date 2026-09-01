import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bleRepository } from "@/services/ble/bleRepository";
import { useBLEStore } from "@/stores/bleStore";
import { useCallback, useEffect } from "react";
import { TaykieDevice, DeviceData } from "@/services/ble/BLEService";

/**
 * BLE React Query Hooks
 *
 * Custom hooks for BLE operations with React Query integration
 * Includes caching, error handling, and optimistic updates
 */

// Query Keys
export const bleKeys = {
  all: ["ble"] as const,
  permissions: () => [...bleKeys.all, "permissions"] as const,
  bluetoothState: () => [...bleKeys.all, "bluetooth-state"] as const,
  deviceData: (deviceId?: string) => [...bleKeys.all, "device-data", deviceId] as const,
  batteryLevel: () => [...bleKeys.all, "battery"] as const,
  compartmentStatus: () => [...bleKeys.all, "compartments"] as const,
};

/**
 * Check BLE permissions
 */
export function useBLEPermissions() {
  return useQuery({
    queryKey: bleKeys.permissions(),
    queryFn: async () => {
      const hasPermissions = await bleRepository.checkPermissions();
      // Update store using setState to avoid re-render loop
      useBLEStore.setState({ hasPermissions });
      return hasPermissions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Check if Bluetooth is enabled
 */
export function useBluetoothState() {
  return useQuery({
    queryKey: bleKeys.bluetoothState(),
    queryFn: async () => {
      const enabled = await bleRepository.isBluetoothEnabled();
      // Update store using setState to avoid re-render loop
      useBLEStore.setState({ isBluetoothEnabled: enabled });
      return enabled;
    },
    staleTime: 5 * 60 * 1000, // ✅ 5 minutes
    refetchInterval: false, // ✅ Disabled auto-refetch
    refetchOnMount: true, // ✅ Only refetch on mount
    refetchOnWindowFocus: false, // ✅ Disabled
    retry: false,
  });
}

/**
 * Scan for devices mutation
 */
export function useScanDevices() {
  return useMutation({
    mutationFn: async (timeoutMs: number = 10000) => {
      useBLEStore.setState({ isScanning: true, scannedDevices: [] });

      const devices = await bleRepository.scanForDevices(timeoutMs);

      // Add devices to store
      devices.forEach((device) => {
        const currentDevices = useBLEStore.getState().scannedDevices;
        const exists = currentDevices.some((d) => d.id === device.id);

        if (!exists) {
          useBLEStore.setState({
            scannedDevices: [...currentDevices, device],
          });
        }
      });

      return devices;
    },
    onSuccess: () => {
      useBLEStore.setState({ isScanning: false });
    },
    onError: (error) => {
      console.error("Scan error:", error);
      useBLEStore.setState({ isScanning: false });
    },
  });
}

/**
 * Stop scanning mutation
 */
export function useStopScan() {
  return useMutation({
    mutationFn: async () => {
      await bleRepository.stopScan();
    },
    onSuccess: () => {
      useBLEStore.setState({ isScanning: false });
    },
  });
}

/**
 * Connect to device mutation
 */
export function useConnectDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      // Update status using setState to avoid re-render loop
      useBLEStore.setState({ connectionStatus: "connecting" });
      const result = await bleRepository.connectToDevice(deviceId);
      return { result, deviceId };
    },
    onSuccess: ({ result, deviceId }) => {
      if (result.success && result.data) {
        const device: TaykieDevice = {
          id: deviceId,
          name: "Taykie Device",
          rssi: -50,
          isConnected: true,
        };

        // Update store using setState to avoid re-render loop
        useBLEStore.setState({
          connectedDevice: device,
          connectionStatus: "connected",
          batteryLevel: result.data.batteryLevel,
          firmwareVersion: result.data.firmwareVersion,
          compartmentStatus: result.data.compartmentStatus,
          lastSync: result.data.lastSync,
        });

        // Invalidate device data queries to trigger refresh
        queryClient.invalidateQueries({ queryKey: bleKeys.deviceData(deviceId) });
      } else {
        useBLEStore.setState({ connectionStatus: "disconnected" });
      }
    },
    onError: (error) => {
      console.error("Connection error:", error);
      useBLEStore.setState({ connectionStatus: "disconnected" });
    },
  });
}

/**
 * Disconnect device mutation
 */
export function useDisconnectDevice() {
  return useMutation({
    mutationFn: async () => {
      await bleRepository.disconnectDevice();
    },
    onSuccess: () => {
      // Reset store using setState to avoid re-render loop
      useBLEStore.setState({
        connectedDevice: null,
        connectionStatus: "disconnected",
        batteryLevel: null,
        firmwareVersion: null,
        compartmentStatus: null,
        lastSync: null,
        deviceData: null,
      });
    },
  });
}

/**
 * Query device data
 * Note: Updates store via onSuccess to avoid infinite loops
 */
export function useDeviceData(enabled: boolean = true) {
  const connectedDevice = useBLEStore((state) => state.connectedDevice);

  return useQuery({
    queryKey: bleKeys.deviceData(connectedDevice?.id),
    queryFn: async () => {
      const data = await bleRepository.getDeviceData();
      return data;
    },
    enabled: enabled && bleRepository.isConnected(),
    staleTime: 2 * 60 * 1000, // ✅ 2 minutes
    refetchInterval: false, // ✅ Disabled auto-refetch
    refetchOnMount: true, // ✅ Only refetch on mount
    retry: 2,
  });
}

/**
 * Query battery level
 * Note: Updates store via onSuccess to avoid infinite loops
 */
export function useBatteryLevel(enabled: boolean = true) {
  return useQuery({
    queryKey: bleKeys.batteryLevel(),
    queryFn: async () => {
      const level = await bleRepository.getBatteryLevel();
      return level;
    },
    enabled: enabled && bleRepository.isConnected(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Query compartment status
 * Note: Updates store via onSuccess to avoid infinite loops
 */
export function useCompartmentStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: bleKeys.compartmentStatus(),
    queryFn: async () => {
      const status = await bleRepository.getCompartmentStatus();
      return status;
    },
    enabled: enabled && bleRepository.isConnected(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Rename device mutation
 */
export function useRenameDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newName: string) => {
      return await bleRepository.renameDevice(newName);
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate device data to refresh name
        queryClient.invalidateQueries({ queryKey: bleKeys.deviceData() });
      }
    },
  });
}

/**
 * Update firmware mutation
 */
export function useUpdateFirmware() {
  return useMutation({
    mutationFn: async () => {
      return await bleRepository.updateFirmware();
    },
  });
}

/**
 * Subscribe to battery level changes
 * Uses stable selector to avoid infinite loops
 */
export function useBatterySubscription(enabled: boolean = true) {
  const isConnected = bleRepository.isConnected();

  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      unsubscribe = await bleRepository.subscribeToBattery((level) => {
        // Update store directly without causing re-render loop
        useBLEStore.setState({ batteryLevel: level });
      });
    };

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [enabled, isConnected]); // Stable dependencies
}

/**
 * Subscribe to compartment status changes
 * Uses stable selector to avoid infinite loops
 */
export function useCompartmentSubscription(enabled: boolean = true) {
  const isConnected = bleRepository.isConnected();

  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      unsubscribe = await bleRepository.subscribeToCompartments((status) => {
        // Update store directly without causing re-render loop
        useBLEStore.setState({ compartmentStatus: status });
      });
    };

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [enabled, isConnected]); // Stable dependencies
}

/**
 * Combined hook for device subscriptions
 */
export function useDeviceSubscriptions(enabled: boolean = true) {
  useBatterySubscription(enabled);
  useCompartmentSubscription(enabled);
}
