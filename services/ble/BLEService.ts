import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import { TaykieProtocol, FuncCode, TAYKIE_UUIDS } from "./TaykieProtocol";
import { PermissionsAndroid, Platform } from "react-native";

export interface TaykieDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnected: boolean;
}

export interface DeviceData {
  batteryLevel: number | null;
  lidState: "open" | "closed" | null;
  toneIndex: number | null;
  volumeLevel: number | null;
  schedules: any[];
  connectionStatus: "connected" | "disconnected" | "connecting";
}

class BLEService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private scanSubscription: any = null;
  private notifySubscription: any = null;

  // Callbacks
  public onStatusUpdated?: (status: Partial<DeviceData>) => void;
  // Add these callbacks to the top of your BLEService class
  public onHistoryCountReceived?: (totalRecords: number) => void;
  public onHistoryBatchReceived?: (records: any[], isValid: boolean) => void;
  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.GRANTED &&
          granted["android.permission.BLUETOOTH_CONNECT"] === PermissionsAndroid.RESULTS.GRANTED &&
          granted["android.permission.ACCESS_FINE_LOCATION"] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles permissions automatically
  }

  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.manager.state();
    return state === "PoweredOn";
  }

  async startScan(onDeviceFound: (device: TaykieDevice) => void, timeoutMs: number = 8000) {
    // ✅ 1. Stop any existing scan FIRST (prevents overlap bugs)
    await this.stopScan();

    const seenDevices = new Set<string>();

    this.scanSubscription = this.manager.startDeviceScan(
      [TAYKIE_UUIDS.SERVICE], // ✅ Only Taykie devices
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error("BLE Scan Error:", error);
          this.stopScan();
          return;
        }

        if (!device) return;

        // ✅ 2. Extra safety filter (Android BLE is unreliable)
        const name = (device.name || device.localName || "").toLowerCase();

        if (!name.includes("taykie")) return;

        // ✅ 3. Prevent duplicates manually
        if (seenDevices.has(device.id)) return;
        seenDevices.add(device.id);

        onDeviceFound({
          id: device.id,
          name: device.localName || device.name,
          rssi: device.rssi ?? -100,
          isConnected: false,
        });
      },
    );

    // ✅ 4. Proper timeout management
    setTimeout(() => {
      this.stopScan();
    }, timeoutMs);
  }

  async stopScan() {
    if (this.scanSubscription) {
      this.manager.stopDeviceScan();
      this.scanSubscription = null;
    }
  }

  async connectToDevice(deviceId: string): Promise<Device> {
    if (this.connectedDevice) await this.disconnect();

    // 1. Removed { requestMTU: 512 } to prevent infinite hangs
    const device = await this.manager.connectToDevice(deviceId);

    // 2. Discover what this device is actually capable of
    await device.discoverAllServicesAndCharacteristics();

    // 3. SAFETY CHECK: Did we connect to the actual Taykie device?
    // We check if the device has the required 0xFFE0 service.
    const services = await device.services();
    const hasTaykieService = services.some(
      (s) => s.uuid.toLowerCase() === TAYKIE_UUIDS.SERVICE.toLowerCase(),
    );

    if (!hasTaykieService) {
      // It's a TV/Laptop/Watch. Disconnect immediately and throw an error to hide the loader.
      await this.manager.cancelDeviceConnection(deviceId);
      throw new Error("This is not a Taykie device (Missing 0xFFE0 service)");
    }

    this.connectedDevice = device;

    // 4. Subscribe to Notifications immediately [cite: 15]
    this.notifySubscription = device.monitorCharacteristicForService(
      TAYKIE_UUIDS.SERVICE,
      TAYKIE_UUIDS.NOTIFY,
      (error, char) => this.handleNotification(error, char),
    );

    // 5. Send Set Time immediately to sync RTC [cite: 117]
    await this.syncTime();

    // 6. Query Device Status to hydrate UI [cite: 120]
    await this.queryStatus();

    device.onDisconnected(() => {
      this.connectedDevice = null;
      if (this.notifySubscription) this.notifySubscription.remove();
    });

    return device;
  }

  async disconnect() {
    if (this.connectedDevice) {
      await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.connectedDevice = null;
    }
  }

  /**
   * Central write method. All commands go through 0xFFE2.
   */
  private async writeCommand(base64Payload: string) {
    if (!this.connectedDevice) throw new Error("No device connected");
    await this.connectedDevice.writeCharacteristicWithoutResponseForService(
      TAYKIE_UUIDS.SERVICE,
      TAYKIE_UUIDS.WRITE,
      base64Payload,
    );
  }

  /**
   * Central read handler. All responses come from 0xFFE1.
   */

  // Inside your handleNotification method:
  private handleNotification(error: any, characteristic: Characteristic | null) {
    if (error || !characteristic?.value) return;

    try {
      const parsed = TaykieProtocol.parseFrame(characteristic.value);

      switch (parsed.funcCode) {
        case FuncCode.QueryStatus:
        case FuncCode.SetSchedule:
          const status = TaykieProtocol.parseStatus(parsed.dataArea);
          if (status && this.onStatusUpdated) this.onStatusUpdated(status);
          break;

        case FuncCode.ReadHistory:
          if (parsed.dataLen === 2) {
            // Total records count (2 bytes big-endian) [cite: 84, 85]
            const totalRecords = (parsed.dataArea[0] << 8) | parsed.dataArea[1];
            if (this.onHistoryCountReceived) this.onHistoryCountReceived(totalRecords);
          } else {
            // Batch of records
            const records = TaykieProtocol.parseHistoryBatch(parsed.dataArea);

            // Pass the records AND the checksum validity to the store.
            // The store will decide to ACK normally or send 0xFFFF for error[cite: 97, 102].
            if (this.onHistoryBatchReceived) this.onHistoryBatchReceived(records, parsed.isValid);
          }
          break;
      }
    } catch (e) {
      console.error("Frame parsing error", e);
    }
  }

  // Function to send Acknowledgement [cite: 96]
  async ackHistoryBatch(highestSeqNoReceived: number) {
    // Send 0xFFFF if error, otherwise highest seq number [cite: 97]
    const highByte = (highestSeqNoReceived >> 8) & 0xff;
    const lowByte = highestSeqNoReceived & 0xff;
    const frame = TaykieProtocol.buildFrame(FuncCode.HistoryAck, [highByte, lowByte], false);
    await this.writeCommand(frame);
  }

  // --- Taykie Specific Commands ---

  async syncTime() {
    const payload = TaykieProtocol.encodeCurrentTime();
    const frame = TaykieProtocol.buildFrame(FuncCode.SetTime, payload, false);
    await this.writeCommand(frame);
  }

  async queryStatus() {
    const frame = TaykieProtocol.buildFrame(FuncCode.QueryStatus, [], true);
    await this.writeCommand(frame);
  }

  async dismissAlert() {
    const frame = TaykieProtocol.buildFrame(FuncCode.DismissAlert, [0x00], false);
    await this.writeCommand(frame);
  }

  async setTone(toneIndex: number) {
    // toneIndex: 0x00 (mute) or 0x01-0x06
    const frame = TaykieProtocol.buildFrame(FuncCode.SetTone, [toneIndex], false);
    await this.writeCommand(frame);
    await this.queryStatus(); // Refresh state
  }

  async setVolume(volumeLevel: number) {
    // volumeLevel: 0x00 (mute) - 0x05 (max)
    const frame = TaykieProtocol.buildFrame(FuncCode.SetVolume, [volumeLevel], false);
    await this.writeCommand(frame);
    await this.queryStatus(); // Refresh state
  }

  async startHistorySync() {
    const frame = TaykieProtocol.buildFrame(FuncCode.ReadHistory, [], true);
    await this.writeCommand(frame);
  }
}

export const bleService = new BLEService();
