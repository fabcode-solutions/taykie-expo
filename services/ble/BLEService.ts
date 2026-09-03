import { Buffer } from "buffer";
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";
import {
  TaykieProtocol,
  TAYKIE_UUIDS,
  CmdType,
  ScheduleSlot,
  DeviceStatus,
  HistoryRecord,
} from "./TaykieProtocol";

export { TAYKIE_UUIDS, CmdType, TaykieProtocol };
export type { ScheduleSlot, DeviceStatus, HistoryRecord };

const DEFAULT_PASSWORD = "000000";

export interface TaykieDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnected: boolean;
}

export interface DeviceData {
  batteryLevel: number | null;
  soundOn: boolean | null;
  lightOn: boolean | null;
  schedules: ScheduleSlot[];
  connectionStatus: "connected" | "disconnected" | "connecting";
}

class BLEService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private notifySubscription: any = null;

  public onStatusUpdated?: (status: Partial<DeviceData>) => void;
  public onHistoryReceived?: (records: HistoryRecord[]) => void;
  public onPasswordVerified?: (success: boolean) => void;
  // Fires for BOTH a user-initiated disconnect() and an unexpected link
  // drop (out of range, device powered off, etc.) — the store uses this as
  // the single place to clear stale device data (battery, schedules, ...).
  public onDeviceDisconnected?: () => void;

  constructor() {
    this.manager = new BleManager();
  }

  // Resolves the promise `waitForReply` is blocking on, once a frame with
  // the awaited cmdType has been fully reassembled and parsed. Only one
  // outstanding wait at a time — this app never pipelines multiple
  // in-flight commands.
  private pendingReply: { cmdType: number; resolve: () => void } | null = null;

  // Blocks until a reply with the given cmdType has actually been received
  // and parsed (or timeoutMs elapses). This exists because large replies —
  // F3 QueryStatus (106 bytes) and any multi-record F6 QueryHistory reply —
  // arrive across several 20-byte BLE packets; a fixed delay can fire the
  // next command before reassembly finishes, interleaving the next reply's
  // fragments into the still-incomplete buffer and corrupting both.
  waitForReply(cmdType: number, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.pendingReply = { cmdType, resolve };
      setTimeout(() => {
        if (this.pendingReply?.resolve === resolve) {
          this.pendingReply = null;
          console.warn(
            `⚠️ waitForReply timed out after ${timeoutMs}ms waiting for cmdType 0x${cmdType.toString(16)}. Buffer so far (${this.notifyBuffer.length} bytes):`,
            Buffer.from(this.notifyBuffer).toString("hex"),
          );
          // A stuck/incomplete buffer would otherwise sit here and corrupt
          // whatever the NEXT command's reply fragments append to it.
          this.notifyBuffer = [];
          resolve(); // Timed out — proceed rather than hang the handshake/poll forever.
        }
      }, timeoutMs);
    });
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.GRANTED &&
          result["android.permission.BLUETOOTH_CONNECT"] === PermissionsAndroid.RESULTS.GRANTED &&
          result["android.permission.ACCESS_FINE_LOCATION"] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }

  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.manager.state();
    return state === "PoweredOn";
  }

  async startScan(onDeviceFound: (device: any) => void) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const state = await this.manager.state();
    if (state !== "PoweredOn") return;

    console.log("🟢 All systems go! Starting scan...");

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("❌ Scan error:", error.message);
        this.manager.stopDeviceScan();
        return;
      }

      if (device && device.name) {
        const name = device.name;
        if (
          name.includes("TayKie") ||
          name.toLowerCase().includes("taykie") ||
          name.toLowerCase().includes("tk-")
        ) {
          console.log(`🎯 Target found: ${device.name} (${device.id})`);
          this.manager.stopDeviceScan();
          onDeviceFound(device);
        }
      }
    });

    setTimeout(() => {
      this.manager.stopDeviceScan();
      console.log("⏱️ Scan timed out and stopped automatically.");
    }, 15000);
  }

  stopScan() {
    console.log("🛑 Stopping scan...");
    this.manager.stopDeviceScan();
  }

  async connectToDevice(deviceId: string): Promise<Device> {
    if (this.connectedDevice) await this.disconnect();

    console.log(`🔗 Connecting to device ID: ${deviceId}...`);
    this.notifyBuffer = [];
    const device = await this.manager.connectToDevice(deviceId);

    await device.discoverAllServicesAndCharacteristics();

    // Opportunistic MTU bump — NOT required for correctness. Per the factory
    // reference doc, the device chunks both directions at a fixed 20 bytes
    // at the app protocol level regardless of negotiated MTU (writeCommand
    // chunks writes, handleNotification reassembles replies), so this is
    // just a best-effort optimization if the peripheral happens to support
    // it. Bounded with a timeout since an unbounded requestMTU previously
    // hung the connection on some devices.
    try {
      await Promise.race([
        device.requestMTU(247),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("MTU request timed out")), 3000),
        ),
      ]);
    } catch (e) {
      console.warn("⚠️ MTU negotiation skipped:", e);
    }

    this.connectedDevice = device;

    // Setup the notification listener BEFORE sending any commands.
    this.notifySubscription = device.monitorCharacteristicForService(
      TAYKIE_UUIDS.SERVICE,
      TAYKIE_UUIDS.NOTIFY,
      (error, char) => this.handleNotification(error, char),
    );

    device.onDisconnected(() => {
      console.log("🔌 Device disconnected.");
      this.connectedDevice = null;
      if (this.notifySubscription) {
        this.notifySubscription.remove();
        this.notifySubscription = null;
      }
      // No point trying to send an "off" command once the link is gone.
      if (this.soundOffTimer) {
        clearTimeout(this.soundOffTimer);
        this.soundOffTimer = null;
      }
      if (this.lightOffTimer) {
        clearTimeout(this.lightOffTimer);
        this.lightOffTimer = null;
      }
      if (this.onDeviceDisconnected) this.onDeviceDisconnected();
    });

    // Per the protocol spec, password verification (E0) must be the first
    // command of every session, or the device may drop the connection.
    // Each step waits for its actual reply (not a guessed delay) before
    // sending the next — see waitForReply's comment for why that matters.
    try {
      await this.verifyPassword(DEFAULT_PASSWORD);
      await this.waitForReply(CmdType.PasswordVerify);
      await this.syncTime();
      await this.waitForReply(CmdType.TimeCalibration);
      await this.queryStatus();
      await this.waitForReply(CmdType.QueryStatus);
      await this.queryHistory();
      await this.waitForReply(CmdType.QueryHistory);
    } catch (e) {
      console.warn("⚠️ Initial handshake warning:", e);
    }

    // This used to swallow every handshake error above and report success
    // regardless — so if the device dropped mid-handshake (a real BleError
    // from a write call, surfaced only as a console warning), the caller
    // still got back a "connected" device and the store marked the
    // connection "Online" even though battery/status never actually
    // arrived. onDeviceDisconnected's native callback clears
    // this.connectedDevice the moment a real disconnect happens, so check
    // it here and fail loudly instead of reporting a dead link as healthy.
    if (!this.connectedDevice) {
      throw new Error("Device disconnected during initial handshake");
    }

    console.log("✅ Successfully connected to Taykie device and listening for updates!");
    return device;
  }

  async disconnect() {
    if (this.connectedDevice) {
      await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.connectedDevice = null;
    }
  }

  // Tracked purely for diagnostics — printed alongside each notification log
  // so a reply can be correlated with the command that triggered it.
  private lastCommandLabel: string | null = null;

  // Per the factory reference doc, both directions are chunked at 20 bytes —
  // the device does NOT rely on BLE MTU negotiation, it's an app-level
  // protocol convention. Any frame over 20 bytes (F2 SetSchedule, and every
  // reply longer than 20 bytes: F3 QueryStatus at 106, F6 QueryHistory once
  // more than ~2 records exist) must be split into 20-byte writes, and
  // incoming multi-packet replies must be reassembled the same way.
  private static readonly CHUNK_SIZE = 20;

  private async writeCommand(base64Payload: string, label: string) {
    if (!this.connectedDevice) {
      throw new Error("No Taykie device currently connected");
    }

    const isConnected = await this.connectedDevice.isConnected();
    if (!isConnected) {
      throw new Error("Taykie device connection was lost");
    }

    this.lastCommandLabel = label;
    const fullBytes = Buffer.from(base64Payload, "base64");
    console.log(`BLE write raw (${label}, ${fullBytes.length} bytes):`, fullBytes.toString("hex"));

    for (let offset = 0; offset < fullBytes.length; offset += BLEService.CHUNK_SIZE) {
      const chunk = fullBytes.subarray(offset, offset + BLEService.CHUNK_SIZE);
      await this.connectedDevice.writeCharacteristicWithoutResponseForService(
        TAYKIE_UUIDS.SERVICE,
        TAYKIE_UUIDS.WRITE,
        chunk.toString("base64"),
      );
      // Small gap between chunks so the peripheral isn't flooded — matches
      // the factory's own chunked-write loop behavior.
      if (offset + BLEService.CHUNK_SIZE < fullBytes.length) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  }

  // Fixed reply lengths (header+cmdType+payload+checksum) per the factory
  // reference doc's command table. QueryHistory is variable (3 + 8*N for N
  // records), handled separately below.
  private static readonly FIXED_REPLY_LENGTHS: Partial<Record<number, number>> = {
    [CmdType.ChecksumError]: 4,
    [CmdType.PasswordVerify]: 4,
    [CmdType.ChangePassword]: 4,
    [CmdType.TimeCalibration]: 4,
    [CmdType.SetSchedule]: 4,
    [CmdType.SoundControl]: 4,
    [CmdType.LightControl]: 4,
    [CmdType.EraseFlash]: 4,
    [CmdType.QueryTime]: 9,
    [CmdType.QueryStatus]: 106,
  };

  // Buffers notify fragments until a complete, correctly-shaped, checksum-
  // valid frame has accumulated (see writeCommand's chunking comment for why
  // this is necessary — a single notify event is not guaranteed to be a
  // whole frame).
  private notifyBuffer: number[] = [];

  private handleNotification(error: any, characteristic: Characteristic | null) {
    if (error || !characteristic?.value) return;

    const chunkBytes = Array.from(Buffer.from(characteristic.value, "base64"));
    this.notifyBuffer = this.notifyBuffer.concat(chunkBytes);
    console.log(
      `BLE notify chunk (${chunkBytes.length} bytes, buffer now ${this.notifyBuffer.length}):`,
      Buffer.from(chunkBytes).toString("hex"),
    );

    // Safety valve: if we've buffered an unreasonable amount without ever
    // completing a valid frame, something is desynced — drop it and start
    // fresh on the next notification rather than buffering forever.
    if (this.notifyBuffer.length > 2048) {
      console.error(
        "Notify buffer overflowed without completing a frame — resetting. raw:",
        Buffer.from(this.notifyBuffer).toString("hex"),
      );
      this.notifyBuffer = [];
      return;
    }

    if (this.notifyBuffer.length < 2) return; // not even header+cmdType yet

    const cmdType = this.notifyBuffer[1];
    const fixedLength = BLEService.FIXED_REPLY_LENGTHS[cmdType];
    const isHistoryReply = cmdType === CmdType.QueryHistory;

    const looksComplete = fixedLength
      ? this.notifyBuffer.length === fixedLength
      : isHistoryReply
        ? this.notifyBuffer.length >= 3 && (this.notifyBuffer.length - 3) % 8 === 0
        : false;

    if (!looksComplete) return; // wait for the next chunk

    const bufferBase64 = Buffer.from(this.notifyBuffer).toString("base64");
    const rawHex = Buffer.from(this.notifyBuffer).toString("hex");
    const frameByteLength = this.notifyBuffer.length;

    let parsed;
    try {
      parsed = TaykieProtocol.parseFrame(bufferBase64);
    } catch (e) {
      console.error(
        "Frame parsing error",
        e,
        `raw bytes (${frameByteLength}, after: ${this.lastCommandLabel}):`,
        rawHex,
      );
      this.notifyBuffer = [];
      return;
    }

    if (!parsed.isValid) {
      // For F6, a "complete-shaped" buffer can still be a coincidental
      // false positive (~1-in-2048) mid-reassembly — give it one more
      // chunk before giving up, unless it's already unreasonably large.
      if (isHistoryReply && frameByteLength < 512) return;
      console.warn(
        `⚠️ Frame checksum mismatch (${frameByteLength} bytes, after: ${this.lastCommandLabel}), raw:`,
        rawHex,
      );
      this.notifyBuffer = [];
      return;
    }

    // Complete, valid frame — clear the buffer before processing so a
    // handler error can't corrupt the next frame's reassembly.
    this.notifyBuffer = [];

    if (this.pendingReply?.cmdType === parsed.cmdType) {
      const resolve = this.pendingReply.resolve;
      this.pendingReply = null;
      resolve();
    }

    switch (parsed.cmdType) {
      case CmdType.ChecksumError:
        console.error(
          `Device reported our last command (${this.lastCommandLabel}) had a bad checksum. raw:`,
          rawHex,
        );
        break;

      case CmdType.PasswordVerify:
      case CmdType.ChangePassword:
        if (this.onPasswordVerified) this.onPasswordVerified(parsed.data[0] === 0x01);
        break;

      case CmdType.QueryStatus: {
        const status = TaykieProtocol.parseStatus(parsed.data);
        if (status) {
          if (this.onStatusUpdated) this.onStatusUpdated(status);
        } else {
          // parseStatus silently returns null if the payload is shorter
          // than expected — this used to leave battery/lastSync stuck at
          // null with zero trace in the console. Now it's at least visible.
          console.error(
            `QueryStatus reply parsed but payload too short: got ${parsed.data.length} bytes, need 103. Frame length was ${frameByteLength}. raw:`,
            rawHex,
          );
        }
        break;
      }

      case CmdType.SetSchedule:
      case CmdType.SoundControl:
      case CmdType.LightControl:
      case CmdType.TimeCalibration:
      case CmdType.EraseFlash: {
        const success = parsed.data[0] === 0x01;
        console.log(`Command 0x${parsed.cmdType.toString(16)} ack:`, success ? "success" : "failed");
        break;
      }

      case CmdType.QueryHistory: {
        const records = TaykieProtocol.parseHistoryRecords(parsed.data);
        // Investigating whether the undocumented "reserved" byte is
        // actually an open/closed flag — log it per record so the pattern
        // (if any) is visible without guessing.
        console.log(
          "History records (reserved byte check):",
          records.map((r) => ({ timestamp: r.timestamp, reserved: r.reserved })),
        );
        if (this.onHistoryReceived) this.onHistoryReceived(records);
        break;
      }

      case CmdType.QueryTime:
        console.log("Device time:", TaykieProtocol.parseTime(parsed.data));
        break;
    }
  }

  async verifyPassword(password: string = DEFAULT_PASSWORD) {
    const frame = TaykieProtocol.buildFrame(CmdType.PasswordVerify, TaykieProtocol.encodePassword(password));
    await this.writeCommand(frame, "E0 PasswordVerify");
  }

  async changePassword(newPassword: string) {
    const frame = TaykieProtocol.buildFrame(CmdType.ChangePassword, TaykieProtocol.encodePassword(newPassword));
    await this.writeCommand(frame, "E1 ChangePassword");
  }

  async syncTime() {
    const frame = TaykieProtocol.buildFrame(CmdType.TimeCalibration, TaykieProtocol.encodeCurrentTime());
    await this.writeCommand(frame, "F1 TimeCalibration");
  }

  async queryTime() {
    const frame = TaykieProtocol.buildFrame(CmdType.QueryTime);
    await this.writeCommand(frame, "F7 QueryTime");
  }

  async queryStatus() {
    const frame = TaykieProtocol.buildFrame(CmdType.QueryStatus);
    await this.writeCommand(frame, "F3 QueryStatus");
  }

  async setSchedule(slots: ScheduleSlot[]) {
    const frame = TaykieProtocol.buildFrame(CmdType.SetSchedule, TaykieProtocol.buildSchedulePayload(slots));
    await this.writeCommand(frame, "F2 SetSchedule");
  }

  // Per the protocol doc, F4/F5 never auto-stop on their own — once turned
  // on, the device plays/lights indefinitely until an explicit off command.
  // This is a client-side safety net (not a firmware guarantee): whenever
  // this app turns one on, it's capped at 60s so a forgotten "on" can't run
  // forever while the app stays connected. It does NOT cover a scheduled
  // reminder firing autonomously on the device while disconnected — that
  // duration is entirely firmware-controlled and out of the app's reach.
  private static readonly TRIGGER_SAFETY_TIMEOUT_MS = 60000;
  private soundOffTimer: ReturnType<typeof setTimeout> | null = null;
  private lightOffTimer: ReturnType<typeof setTimeout> | null = null;

  // onOff true starts the sound with the given type/volume — the device
  // will NOT auto-stop it; onOff false is the only way to silence it.
  async triggerSound(onOff: boolean, soundType: number, volumeLevel: number) {
    // UI-facing 0-5 (or up to 0x0F) volume steps map onto the documented
    // 0xE0-0xEF byte range.
    const volumeByte = 0xe0 + Math.min(0x0f, Math.max(0, volumeLevel));
    const frame = TaykieProtocol.buildFrame(CmdType.SoundControl, [
      onOff ? 0x01 : 0x00,
      soundType,
      volumeByte,
    ]);
    await this.writeCommand(frame, "F4 SoundControl");

    if (this.soundOffTimer) {
      clearTimeout(this.soundOffTimer);
      this.soundOffTimer = null;
    }
    if (onOff) {
      this.soundOffTimer = setTimeout(() => {
        this.triggerSound(false, soundType, volumeLevel).catch((e) =>
          console.warn("Failed to auto-stop sound after safety timeout:", e),
        );
      }, BLEService.TRIGGER_SAFETY_TIMEOUT_MS);
    }
  }

  // onOff true starts the light with the given type — the device will NOT
  // auto-stop it; onOff false is the only way to turn it off.
  async triggerLight(onOff: boolean, lightType: number) {
    const frame = TaykieProtocol.buildFrame(CmdType.LightControl, [
      onOff ? 0x01 : 0x00,
      lightType,
      0x00,
    ]);
    await this.writeCommand(frame, "F5 LightControl");

    if (this.lightOffTimer) {
      clearTimeout(this.lightOffTimer);
      this.lightOffTimer = null;
    }
    if (onOff) {
      this.lightOffTimer = setTimeout(() => {
        this.triggerLight(false, lightType).catch((e) =>
          console.warn("Failed to auto-stop light after safety timeout:", e),
        );
      }, BLEService.TRIGGER_SAFETY_TIMEOUT_MS);
    }
  }

  // There's no explicit "dismiss" command in the protocol — the documented
  // way to stop an active reminder is to send the sound/light "off" frames.
  async dismissAlert() {
    await this.triggerSound(false, 0x00, 0x00);
    await this.triggerLight(false, 0x00);
  }

  async queryHistory() {
    const frame = TaykieProtocol.buildFrame(CmdType.QueryHistory);
    await this.writeCommand(frame, "F6 QueryHistory");
  }

  // Destructive: wipes the device's stored history. Not wired to any
  // automatic flow — only call this on explicit user confirmation.
  async eraseHistoryFlash() {
    const frame = TaykieProtocol.buildFrame(CmdType.EraseFlash);
    await this.writeCommand(frame, "FF EraseFlash");
  }
}

export const bleService = new BLEService();
