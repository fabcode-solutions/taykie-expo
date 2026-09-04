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
  // drop (out of range, device powered off, a lid-open triggering a brief
  // power glitch on the radio, etc.) — the store uses this as the single
  // place to clear stale device data (battery, schedules, ...). The
  // wasIntentional flag lets the store tell the two apart: only an
  // unexpected drop should trigger an automatic reconnect attempt.
  public onDeviceDisconnected?: (wasIntentional: boolean) => void;

  // Set right before we ourselves tear down the connection (disconnect() /
  // connectToDevice()'s own disconnect-then-reconnect) so the native
  // onDisconnected callback below can tell a deliberate teardown apart from
  // the device dropping the link on its own.
  private isIntentionalDisconnect = false;

  constructor() {
    this.manager = new BleManager();
  }

  // FIFO queue of in-flight replies being waited on, oldest first. Writes
  // are strictly ordered through writeQueue (see writeCommand) and this
  // peripheral processes commands sequentially, so replies arrive in the
  // same order their commands were sent — the oldest pending waiter is
  // always the correct one to resolve next.
  //
  // This used to be a single slot, which worked when the app only ever had
  // one outstanding command (the original handshake/poll pattern). Once
  // ensurePasswordVerified() started running before every command, two
  // independent flows (e.g. the periodic poll and an on-demand
  // triggerSound from tapping the tone/volume picker) could each call
  // waitForReply around the same time — the second call's entry silently
  // overwrote the first's, so the first caller's real reply never resolved
  // it and it just timed out, dropping the sound with no visible error
  // (only a console warning). A FIFO queue lets both wait independently.
  private pendingReplies: {
    cmdType: number;
    resolve: () => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }[] = [];

  // Blocks until a reply with the given cmdType has actually been received
  // and parsed (or timeoutMs elapses). This exists because large replies —
  // F3 QueryStatus (106 bytes) and any multi-record F6 QueryHistory reply —
  // arrive across several 20-byte BLE packets; a fixed delay can fire the
  // next command before reassembly finishes, interleaving the next reply's
  // fragments into the still-incomplete buffer and corrupting both.
  waitForReply(cmdType: number, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve) => {
      const entry = {
        cmdType,
        resolve: () => {},
        timeoutId: null as unknown as ReturnType<typeof setTimeout>,
      };
      entry.resolve = () => {
        clearTimeout(entry.timeoutId);
        const idx = this.pendingReplies.indexOf(entry);
        if (idx !== -1) this.pendingReplies.splice(idx, 1);
        resolve();
      };
      entry.timeoutId = setTimeout(() => {
        const idx = this.pendingReplies.indexOf(entry);
        if (idx !== -1) {
          this.pendingReplies.splice(idx, 1);
          console.warn(
            `⚠️ waitForReply timed out after ${timeoutMs}ms waiting for cmdType 0x${cmdType.toString(16)}. Buffer so far (${this.notifyBuffer.length} bytes):`,
            Buffer.from(this.notifyBuffer).toString("hex"),
          );
          // Only clear the buffer if nothing else is still waiting —
          // otherwise this would wipe out bytes another still-pending
          // command's reply needs mid-reassembly.
          if (this.pendingReplies.length === 0) this.notifyBuffer = [];
        }
        resolve(); // Timed out — proceed rather than hang forever.
      }, timeoutMs);
      this.pendingReplies.push(entry);
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
    // Scanning shares the same BLE radio as an active GATT connection.
    // Running a scan while already connected to a device is a known way to
    // degrade/corrupt writes and notifications on that connection on
    // Android — confirmed in device logs as a run of "bad checksum" NACKs
    // and an eventual disconnect coinciding with a scan in progress.
    if (this.connectedDevice) {
      console.warn("⚠️ Skipping scan — already connected to a device.");
      return;
    }

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
        // TEMP DEBUG: log every advertised device seen during a scan, not
        // just ones matching the filter below — otherwise a real device
        // with an unexpected name is silently dropped with zero visibility.
        console.log(`👀 Saw BLE device: "${name}" (${device.id}) rssi=${device.rssi}`);
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
      const wasIntentional = this.isIntentionalDisconnect;
      this.isIntentionalDisconnect = false;
      console.log(`🔌 Device disconnected. (${wasIntentional ? "intentional" : "unexpected"})`);
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
      if (this.onDeviceDisconnected) this.onDeviceDisconnected(wasIntentional);
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
      this.isIntentionalDisconnect = true;
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

  // Independently-triggered commands (e.g. a push-notification's device
  // sound trigger firing while the background status poll's own write is
  // still in flight) must never interleave their bytes on the wire — this
  // peripheral's firmware is conservative about command ordering (per the
  // factory doc, password-verify must literally be the first command of a
  // session "or the device may drop the connection"), so a garbled/
  // interleaved byte stream is a plausible cause of a mid-session drop.
  // Chaining every write through this queue serializes them regardless of
  // which caller fired first.
  private writeQueue: Promise<void> = Promise.resolve();

  private writeCommand(base64Payload: string, label: string): Promise<void> {
    const task = this.writeQueue.then(() => this.writeCommandExclusive(base64Payload, label));
    // Keep the queue moving even if this write fails, so one bad/timed-out
    // command doesn't permanently block every later command.
    this.writeQueue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  private async writeCommandExclusive(base64Payload: string, label: string) {
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
      // Buffer.prototype.subarray is supposed to return another Buffer (via
      // Symbol.species), but on this Hermes/New Architecture setup it was
      // silently degrading to a plain Uint8Array — which has no base64-aware
      // toString and falls back to Array's default comma-joined
      // stringification (e.g. "90,224,0,..." instead of real base64). That
      // garbage string was then sent straight to the native BLE write call,
      // which rejected it as "invalid data format" on every single command.
      // Re-wrapping with Buffer.from() forces a genuine Buffer instance
      // regardless of what subarray() handed back.
      const chunk = Buffer.from(fullBytes.subarray(offset, offset + BLEService.CHUNK_SIZE));
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

    // Resolve the oldest pending waiter if this reply matches its cmdType,
    // or if it's a ChecksumError (cmdType 0x00, which never matches any
    // awaited command's own cmdType, but is still a definitive reply to
    // whatever was sent last — without this it'd silently block whatever's
    // waiting for the full 3s timeout even though the device already told
    // us the command failed).
    const oldest = this.pendingReplies[0];
    if (oldest && (oldest.cmdType === parsed.cmdType || parsed.cmdType === CmdType.ChecksumError)) {
      oldest.resolve();
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

  // Per the protocol doc, password verification must be the first command
  // of every session — but devices were also observed rejecting F3/F6/F4
  // with genuine (checksum-valid) "bad checksum" NACKs well into an
  // otherwise healthy connection, consistent with the device expecting a
  // fresh E0 before each meaningful command rather than just once at
  // connect. Centralized here so every public command below benefits
  // without repeating this at each call site (in BLEService or its
  // callers).
  private async ensurePasswordVerified() {
    await this.verifyPassword();
    await this.waitForReply(CmdType.PasswordVerify);
  }

  async changePassword(newPassword: string) {
    const frame = TaykieProtocol.buildFrame(CmdType.ChangePassword, TaykieProtocol.encodePassword(newPassword));
    await this.writeCommand(frame, "E1 ChangePassword");
  }

  async syncTime() {
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(CmdType.TimeCalibration, TaykieProtocol.encodeCurrentTime());
    await this.writeCommand(frame, "F1 TimeCalibration");
  }

  async queryTime() {
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(CmdType.QueryTime);
    await this.writeCommand(frame, "F7 QueryTime");
  }

  async queryStatus() {
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(CmdType.QueryStatus);
    await this.writeCommand(frame, "F3 QueryStatus");
  }

  async setSchedule(slots: ScheduleSlot[]) {
    await this.ensurePasswordVerified();
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

  // Serializes each command's FULL request/reply round trip (E0 handshake,
  // then the command write, then that command's own reply) end-to-end —
  // unlike writeQueue, which only serializes the raw write call itself.
  // Without this, two independently-triggered calls (e.g. tapping the Tone
  // picker and the Volume picker in quick succession) could each start
  // their own ensurePasswordVerified() before the other's E0 reply had
  // arrived. Confirmed in device logs: two back-to-back E0 writes going out
  // before either got a reply, both timing out with zero bytes back, and
  // the SoundControl command that was actually supposed to sound the
  // device either never got sent cleanly or was ignored by the (now
  // desynced) firmware — the device stayed silent.
  private commandLock: Promise<void> = Promise.resolve();

  private withCommandLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.commandLock.then(fn);
    this.commandLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  // onOff true starts the sound with the given type/volume — the device
  // will NOT auto-stop it; onOff false is the only way to silence it.
  async triggerSound(onOff: boolean, soundType: number, volumeLevel: number) {
    await this.withCommandLock(async () => {
      await this.ensurePasswordVerified();
      // UI-facing 0-5 (or up to 0x0F) volume steps map onto the documented
      // 0xE0-0xEF byte range.
      const volumeByte = 0xe0 + Math.min(0x0f, Math.max(0, volumeLevel));
      const frame = TaykieProtocol.buildFrame(CmdType.SoundControl, [
        onOff ? 0x01 : 0x00,
        soundType,
        volumeByte,
      ]);
      await this.writeCommand(frame, "F4 SoundControl");
      await this.waitForReply(CmdType.SoundControl);
    });

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
    await this.withCommandLock(async () => {
      await this.ensurePasswordVerified();
      const frame = TaykieProtocol.buildFrame(CmdType.LightControl, [
        onOff ? 0x01 : 0x00,
        lightType,
        0x00,
      ]);
      await this.writeCommand(frame, "F5 LightControl");
      await this.waitForReply(CmdType.LightControl);
    });

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
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(CmdType.QueryHistory);
    await this.writeCommand(frame, "F6 QueryHistory");
  }

  // Destructive: wipes the device's stored history. Not wired to any
  // automatic flow — only call this on explicit user confirmation.
  async eraseHistoryFlash() {
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(CmdType.EraseFlash);
    await this.writeCommand(frame, "FF EraseFlash");
  }
}

export const bleService = new BLEService();