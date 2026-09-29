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
import { volumePercentToByte } from "../../utils/toneAudio";

export { TAYKIE_UUIDS, CmdType, TaykieProtocol };
export type { ScheduleSlot, DeviceStatus, HistoryRecord };

export const DEFAULT_PASSWORD = "000000";

// How long a scan runs before stopping itself — exported so bleStore's UI
// timeout can match it, so "isScanning" in the UI never goes false while
// the radio is still actually scanning underneath it.
export const BLE_SCAN_DURATION_MS = 15000;

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
  // The password every command re-verifies against (see
  // ensurePasswordVerified) — starts at the factory default, but the store
  // seeds it from persisted storage on init, and changePassword() updates it
  // in place once the device confirms a change.
  private currentPassword: string = DEFAULT_PASSWORD;

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
  // iOS only: fires when the OS silently killed the app in the background
  // (memory pressure, etc.) and then relaunched it because a previously
  // connected peripheral is still linked at the native CoreBluetooth level.
  // This does NOT fire after a user manually force-quits the app from the
  // app switcher — Apple blocks any background relaunch in that case
  // regardless of what this app does. Only useful for the "OS silently
  // killed it" case, not "user swiped it away."
  public onStateRestored?: (restoredDeviceIds: string[]) => void;

  // Set right before we ourselves tear down the connection (disconnect() /
  // connectToDevice()'s own disconnect-then-reconnect) so the native
  // onDisconnected callback below can tell a deliberate teardown apart from
  // the device dropping the link on its own.
  private isIntentionalDisconnect = false;

  // Tracks a real native scan in progress, plus every caller's callback for
  // it — startScan can legitimately be called from more than one mounted
  // screen at once (e.g. the Device tab's own "scan while disconnected"
  // effect is still mounted underneath when the dedicated pair-device
  // screen mounts and starts its own scan). Calling
  // manager.startDeviceScan() a second time while one is already active
  // throws "Cannot start scanning operation" — and worse, stopping first
  // doesn't reliably help, since the native stop isn't guaranteed to have
  // fully released the radio before a start immediately follows it. So a
  // second (or third) caller now just attaches its callback to the ALREADY
  // running scan instead of ever issuing a second native start.
  private activeScanListeners: ((device: any) => void)[] | null = null;
  private scanStopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.manager = new BleManager({
      // iOS-only (react-native-ble-plx no-ops this on Android). Lets iOS
      // relaunch the app in the background to keep handling an
      // already-connected peripheral if the OS silently killed the app
      // process — a real improvement over having nothing configured, but
      // it categorically does not apply to a manual force-quit; Apple
      // blocks background relaunch entirely in that case.
      restoreStateIdentifier: "TaykieBleRestoreID",
      restoreStateFunction: (restoredState) => {
        const restoredIds = restoredState?.connectedPeripherals.map((d) => d.id) ?? [];
        if (restoredIds.length > 0) {
          console.log("🔄 iOS restored BLE state for:", restoredIds);
        }
        this.onStateRestored?.(restoredIds);
      },
    });
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
    resolve: (acked: boolean) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }[] = [];

  // Blocks until a reply with the given cmdType has actually been received
  // and parsed (or timeoutMs elapses). This exists because large replies —
  // F3 QueryStatus (106 bytes) and any multi-record F6 QueryHistory reply —
  // arrive across several 20-byte BLE packets; a fixed delay can fire the
  // next command before reassembly finishes, interleaving the next reply's
  // fragments into the still-incomplete buffer and corrupting both.
  //
  // Resolves `true` only if the device's own reply confirmed success (or the
  // reply has no simple success/fail byte to check, e.g. QueryStatus) —
  // `false` for an explicit failure byte, a ChecksumError reply, or a
  // timeout with no reply at all. Callers that only care "did a reply
  // arrive" (the original handshake steps) can still just `await` this
  // without inspecting the result.
  waitForReply(cmdType: number, timeoutMs = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const entry = {
        cmdType,
        resolve: (_acked: boolean) => {},
        timeoutId: null as unknown as ReturnType<typeof setTimeout>,
      };
      entry.resolve = (acked: boolean) => {
        clearTimeout(entry.timeoutId);
        const idx = this.pendingReplies.indexOf(entry);
        if (idx !== -1) this.pendingReplies.splice(idx, 1);
        resolve(acked);
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
          // A timed-out F6 must not leave awaitingHistoryReply stuck true —
          // every later reply (E0, F1, F3, F5, ...) would otherwise be
          // misread as history data by the branch above.
          if (cmdType === CmdType.QueryHistory) this.awaitingHistoryReply = false;
        }
        resolve(false); // Timed out — no confirmation, but proceed rather than hang forever.
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

    // A scan is already running (started by another caller) — just add
    // this caller's callback to it rather than issuing a second native
    // start, which is what used to throw "Cannot start scanning operation".
    if (this.activeScanListeners) {
      this.activeScanListeners.push(onDeviceFound);
      return;
    }

    console.log("🟢 All systems go! Starting scan...");
    this.activeScanListeners = [onDeviceFound];

    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("❌ Scan error:", error.message);
        this.activeScanListeners = null;
        if (this.scanStopTimer) {
          clearTimeout(this.scanStopTimer);
          this.scanStopTimer = null;
        }
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
          console.log(`🎯 Target found: "${name}" (${device.id}) rssi=${device.rssi}`);
          // Deliberately NOT stopping the scan here — stopping on the first
          // match meant a second (or third) nearby Taykie device could never
          // be discovered, let alone chosen between. The scan now keeps
          // running its full window, and every caller currently attached
          // (see activeScanListeners above) hears about each match.
          this.activeScanListeners?.forEach((listener) => listener(device));
        }
      }
    });

    this.scanStopTimer = setTimeout(() => {
      this.activeScanListeners = null;
      this.scanStopTimer = null;
      this.manager.stopDeviceScan();
      console.log("⏱️ Scan timed out and stopped automatically.");
    }, BLE_SCAN_DURATION_MS);
  }

  stopScan() {
    console.log("🛑 Stopping scan...");
    this.activeScanListeners = null;
    if (this.scanStopTimer) {
      clearTimeout(this.scanStopTimer);
      this.scanStopTimer = null;
    }
    this.manager.stopDeviceScan();
  }

  async connectToDevice(deviceId: string): Promise<Device> {
    if (this.connectedDevice) await this.disconnect();

    console.log(`🔗 Connecting to device ID: ${deviceId}...`);
    this.notifyBuffer = [];
    const device = await this.manager.connectToDevice(deviceId);

    await device.discoverAllServicesAndCharacteristics();

    // This MTU bump is now load-bearing for F2 SetSchedule (103 bytes) — see
    // writeCommandExclusive's comment for why writes can no longer be
    // manually split into 20-byte chunks. Still wrapped in try/catch since
    // an unbounded requestMTU previously hung the connection on some
    // devices, and every other command is small enough to fit even at the
    // un-negotiated default MTU (23, i.e. 20 usable bytes) if this fails.
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
      await this.verifyPassword();
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

    // Silences anything left ringing from before this connection dropped —
    // see recoverPendingAlerts's own comment. Best-effort: a failure here
    // must not fail the connection itself (the device did connect), so it's
    // logged, not thrown.
    try {
      await this.recoverPendingAlerts();
    } catch (e) {
      console.warn("recoverPendingAlerts failed after connect:", e);
    }

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

  // The device's OWN replies longer than 20 bytes (F3 QueryStatus at 106,
  // F6 QueryHistory once more than ~2 records exist) still arrive split
  // across multiple ~20-byte notify packets, reassembled in notifyBuffer
  // below — that direction is unaffected by writeCommandExclusive's single-
  // write fix above, since it's the device (not us) doing the chunking there.

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

    // ATT overhead is 3 bytes, so usable payload per write is mtu-3. If MTU
    // negotiation didn't stick (see connectToDevice's try/catch), a large
    // frame like F2 will now fail the native write outright instead of the
    // old silent per-chunk corruption — surfacing that clearly here rather
    // than leaving it to a cryptic native error.
    const negotiatedMtu = this.connectedDevice.mtu ?? 23;
    if (fullBytes.length > negotiatedMtu - 3) {
      console.warn(
        `${label}: ${fullBytes.length}-byte frame exceeds usable MTU (${negotiatedMtu - 3} bytes) — MTU negotiation likely didn't stick on this device. Write may fail.`,
      );
    }

    // Previously split into 20-byte writes in a loop (per the factory doc's
    // description of the legacy iOS app), on the assumption the device
    // reassembles multiple separate write calls into one logical frame —
    // the same way it reassembles its OWN multi-packet notify replies. Real
    // hardware testing disproved that: F2 SetSchedule (the only command over
    // 20 bytes) came back with one distinct ChecksumError reply PER 20-byte
    // chunk sent (e.g. 6 separate errors for 6 chunks), meaning the device
    // validates each individual BLE write as its own standalone frame rather
    // than reassembling. So the whole frame must arrive in a single write —
    // which is exactly what the negotiated MTU bump at connect (247) is for.
    await this.connectedDevice.writeCharacteristicWithoutResponseForService(
      TAYKIE_UUIDS.SERVICE,
      TAYKIE_UUIDS.WRITE,
      base64Payload,
    );
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

  // F6's reply does NOT follow the [header][cmdType][data][checksum] shape
  // every other command uses — confirmed against a real device (erase, one
  // physical lid-open, re-query): it's [0x5A][record]*N[0xAA], with no
  // cmdType echo and no per-frame checksum trailer at all. So byte[1] is
  // either a record's own first byte (which is never 0xf6) or, with zero
  // records, the 0xAA terminator itself — the old `notifyBuffer[1] ===
  // CmdType.QueryHistory` check could never be true, which is why every F6
  // query timed out. This flag is the only reliable way to tell "we're
  // waiting on an F6 reply" apart from any other reply, since it can't be
  // determined from the bytes themselves.
  private awaitingHistoryReply = false;

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
      this.awaitingHistoryReply = false;
      return;
    }

    if (this.notifyBuffer.length < 2) return; // not even header+cmdType yet

    // F6 reply: [0x5A][record]*N[0xAA] — see awaitingHistoryReply's comment.
    // Handled entirely separately from the generic frame logic below, since
    // it doesn't have that logic's [header][cmdType][data][checksum] shape
    // at all (no cmdType echo to key off, no per-frame checksum).
    if (this.awaitingHistoryReply) {
      const last = this.notifyBuffer[this.notifyBuffer.length - 1];
      const bodyLength = this.notifyBuffer.length - 2; // minus header + terminator
      const looksComplete = last === 0xaa && bodyLength >= 0 && bodyLength % 8 === 0;

      if (!looksComplete) return; // wait for the next chunk

      const rawHex = Buffer.from(this.notifyBuffer).toString("hex");
      const recordBytes = this.notifyBuffer.slice(1, -1);
      console.log(
        `📜 F6 QueryHistory reply: ${this.notifyBuffer.length} total byte(s), ${recordBytes.length} record byte(s) -> ${recordBytes.length / 8} record(s). raw:`,
        rawHex,
      );

      const records = TaykieProtocol.parseHistoryRecords(recordBytes);
      console.log(
        `📜 F6 parsed ${records.length} record(s) after CRC check (reserved byte check):`,
        records.map((r) => ({ timestamp: r.timestamp, reserved: r.reserved })),
      );

      this.notifyBuffer = [];
      this.awaitingHistoryReply = false;

      const oldest = this.pendingReplies[0];
      if (oldest && oldest.cmdType === CmdType.QueryHistory) oldest.resolve(true);

      if (this.onHistoryReceived) this.onHistoryReceived(records);
      return;
    }

    const cmdType = this.notifyBuffer[1];
    const fixedLength = BLEService.FIXED_REPLY_LENGTHS[cmdType];

    const looksComplete = fixedLength ? this.notifyBuffer.length === fixedLength : false;

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
      // Only these cmdTypes reply with a simple 00/01 success/fail byte per
      // the protocol — QueryStatus/QueryHistory/QueryTime reply with actual
      // data instead, so their arrival alone counts as a confirmed reply.
      const isSimpleAckReply = [
        CmdType.PasswordVerify,
        CmdType.ChangePassword,
        CmdType.TimeCalibration,
        CmdType.SetSchedule,
        CmdType.SoundControl,
        CmdType.LightControl,
        CmdType.EraseFlash,
      ].includes(parsed.cmdType);
      const acked =
        parsed.cmdType !== CmdType.ChecksumError && (!isSimpleAckReply || parsed.data[0] === 0x01);
      oldest.resolve(acked);
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
        console.log(
          `Command 0x${parsed.cmdType.toString(16)} ack:`,
          success ? "success" : "failed",
        );
        break;
      }

      // CmdType.QueryHistory is handled earlier, in the awaitingHistoryReply
      // branch above — its reply doesn't reach this generic switch at all
      // (see that branch's comment for why F6 needs separate handling).

      case CmdType.QueryTime:
        console.log("Device time:", TaykieProtocol.parseTime(parsed.data));
        break;
    }
  }

  // Seeds the password this instance authenticates every command with —
  // called by the store on init/reconnect with whatever was last persisted,
  // since a fresh BLEService instance otherwise has no memory of a password
  // that was changed away from the factory default in a previous session.
  setPassword(password: string) {
    this.currentPassword = password;
  }

  async verifyPassword(password: string = this.currentPassword) {
    const frame = TaykieProtocol.buildFrame(
      CmdType.PasswordVerify,
      TaykieProtocol.encodePassword(password),
    );
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

  // Verifies the password the user typed against what the device actually
  // has right now (rather than trusting our own persisted copy, which could
  // be stale) before attempting the change — this is the only path that's
  // allowed to move currentPassword away from ensurePasswordVerified's
  // default, and only once the device has confirmed the change.
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ verified: boolean; changed: boolean }> {
    return this.withCommandLock(async () => {
      await this.verifyPassword(currentPassword);
      const verified = await this.waitForReply(CmdType.PasswordVerify);
      if (!verified) return { verified: false, changed: false };

      const frame = TaykieProtocol.buildFrame(
        CmdType.ChangePassword,
        TaykieProtocol.encodePassword(newPassword),
      );
      await this.writeCommand(frame, "E1 ChangePassword");
      const changed = await this.waitForReply(CmdType.ChangePassword);
      if (changed) this.currentPassword = newPassword;
      return { verified: true, changed };
    });
  }

  async syncTime() {
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(
      CmdType.TimeCalibration,
      TaykieProtocol.encodeCurrentTime(),
    );
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

  // F2 is the only outbound command longer than 20 bytes (100-byte payload,
  // ~6 chunks) — every other write fits in a single chunk. A ChecksumError
  // reply is the device's own well-defined "what I received doesn't match
  // what you say you sent" signal (see the protocol doc's Checksum Error
  // Command), which is exactly the retry-safe case: resending the identical
  // frame is correct, not a workaround, since nothing about the command
  // itself was wrong.
  private static readonly SET_SCHEDULE_MAX_ATTEMPTS = 3;

  async setSchedule(slots: ScheduleSlot[]): Promise<boolean> {
    await this.ensurePasswordVerified();
    const frame = TaykieProtocol.buildFrame(
      CmdType.SetSchedule,
      TaykieProtocol.buildSchedulePayload(slots),
    );

    for (let attempt = 1; attempt <= BLEService.SET_SCHEDULE_MAX_ATTEMPTS; attempt++) {
      await this.writeCommand(frame, `F2 SetSchedule (attempt ${attempt})`);
      const acked = await this.waitForReply(CmdType.SetSchedule);
      if (acked) return true;
      console.warn(
        `F2 SetSchedule attempt ${attempt}/${BLEService.SET_SCHEDULE_MAX_ATTEMPTS} was rejected` +
          (attempt < BLEService.SET_SCHEDULE_MAX_ATTEMPTS ? " — retrying." : " — giving up."),
      );
    }
    return false;
  }

  // Per the protocol doc, F4/F5 never auto-stop on their own — once turned
  // on, the device plays/lights indefinitely until an explicit off command.
  // This is a client-side safety net (not a firmware guarantee): whenever
  // this app turns one on, it's capped at 60s so a forgotten "on" can't run
  // forever while the app stays connected. It does NOT cover a scheduled
  // reminder firing autonomously on the device while disconnected — that
  // duration is entirely firmware-controlled and out of the app's reach.
  private static readonly TRIGGER_SAFETY_TIMEOUT_MS = 60000;
  // True from a successful "on" write until a successful "off" write — see
  // triggerSound/triggerLight. If the off write itself fails (typically
  // because the link dropped mid-ring, the exact case brief §Priority 3
  // "reminder auto-stop" calls out), the flag is left true rather than
  // cleared, so recoverPendingAlerts() below can pick it back up as soon as
  // the device reconnects instead of the ring depending on a retry that was
  // never scheduled.
  private soundActive = false;
  private lightActive = false;
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
  // Returns whether the device's own reply actually confirmed it (vs. a
  // failure byte or no reply at all within the timeout) — callers that only
  // care the write went out can ignore the return value.
  async triggerSound(onOff: boolean, soundType: number, volumeLevel: number): Promise<boolean> {
    const acked = await this.withCommandLock(async () => {
      await this.ensurePasswordVerified();
      // The UI presents a smooth 0-100% range (device.tsx's volume slider),
      // but the protocol's actual volume byte only has 16 real steps
      // (0xE0-0xEF) — every percentage necessarily quantizes onto one of
      // those 16 steps. volumePercentToByte (utils/toneAudio.ts) is the one
      // shared place this scaling happens, so the schedule-sync F2 builder
      // computes byte-for-byte the same value for a given percentage.
      const volumeByte = volumePercentToByte(volumeLevel);
      console.log(
        `🔊 triggerSound: onOff=${onOff}, soundType=${soundType}, volumeLevel(0-100)=${volumeLevel} -> volumeByte=0x${volumeByte.toString(16)}`,
      );
      const frame = TaykieProtocol.buildFrame(CmdType.SoundControl, [
        onOff ? 0x01 : 0x00,
        soundType,
        volumeByte,
      ]);
      await this.writeCommand(frame, "F4 SoundControl");
      const acked = await this.waitForReply(CmdType.SoundControl);
      console.log(`🔊 triggerSound: F4 SoundControl reply acked=${acked}`);
      return acked;
    });

    // Only reached once the write itself succeeded — if the device dropped
    // mid-write, withCommandLock rejected above and soundActive is left as
    // it was (true, if this was an attempt to turn a still-ringing sound
    // off), which is exactly the state recoverPendingAlerts() needs.
    this.soundActive = onOff;

    if (this.soundOffTimer) {
      clearTimeout(this.soundOffTimer);
      this.soundOffTimer = null;
    }
    if (onOff) {
      this.soundOffTimer = setTimeout(() => {
        this.triggerSound(false, soundType, volumeLevel).catch((e) =>
          console.warn("Failed to auto-stop sound after safety timeout (will retry on reconnect if the link is down):", e),
        );
      }, BLEService.TRIGGER_SAFETY_TIMEOUT_MS);
    }
    return acked;
  }

  // onOff true starts the light with the given type — the device will NOT
  // auto-stop it; onOff false is the only way to turn it off. Returns
  // whether the device's own reply confirmed it — see triggerSound.
  async triggerLight(onOff: boolean, lightType: number): Promise<boolean> {
    const acked = await this.withCommandLock(async () => {
      await this.ensurePasswordVerified();
      const frame = TaykieProtocol.buildFrame(CmdType.LightControl, [
        onOff ? 0x01 : 0x00,
        lightType,
        0x00,
      ]);
      await this.writeCommand(frame, "F5 LightControl");
      return this.waitForReply(CmdType.LightControl);
    });

    // See the matching comment in triggerSound — only reached on a
    // successful write.
    this.lightActive = onOff;

    if (this.lightOffTimer) {
      clearTimeout(this.lightOffTimer);
      this.lightOffTimer = null;
    }
    if (onOff) {
      this.lightOffTimer = setTimeout(() => {
        this.triggerLight(false, lightType).catch((e) =>
          console.warn("Failed to auto-stop light after safety timeout (will retry on reconnect if the link is down):", e),
        );
      }, BLEService.TRIGGER_SAFETY_TIMEOUT_MS);
    }
    return acked;
  }

  // brief §Priority 3 "reminder auto-stop": "Confirm what happens if a
  // reminder fires and the connection drops. A reminder must never ring
  // indefinitely." The device has no auto-stop of its own (see triggerSound/
  // triggerLight above) and a disconnect cancels the safety timer outright
  // (nothing to write to), so without this, a reminder that starts sounding
  // and then loses the connection mid-ring stays on until the user happens
  // to open the app and tap "Dismiss Active Alert" — which could be a long
  // time, or never. Called on every successful connect (see
  // connectToDevice): bounds the worst case to "however long until the
  // phone reconnects" instead of depending on the user noticing. It does
  // NOT cover a reminder scheduled to fire autonomously on the device (F2
  // slots) while the phone was never connected in the first place — that
  // duration is entirely firmware-controlled; see the open factory question
  // in the status report ("do scheduled reminders stop automatically, and
  // after how long?").
  async recoverPendingAlerts(): Promise<void> {
    if (!this.soundActive && !this.lightActive) return;

    console.warn(
      `Recovering an alert left on across a disconnect (sound=${this.soundActive}, light=${this.lightActive}) — silencing now.`,
    );

    if (this.soundActive) {
      try {
        await this.triggerSound(false, 0x00, 0x00);
      } catch (e) {
        console.warn("Failed to recover a pending sound alert on connect:", e);
      }
    }
    if (this.lightActive) {
      try {
        await this.triggerLight(false, 0x00);
      } catch (e) {
        console.warn("Failed to recover a pending light alert on connect:", e);
      }
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
    this.awaitingHistoryReply = true;
    await this.writeCommand(frame, "F6 QueryHistory");
  }

  // The periodic background poll (status + history) used to run queryStatus/
  // queryHistory directly, outside withCommandLock — only triggerSound/
  // triggerLight went through the lock. That let a poll cycle already in
  // flight (E0/F3/E0/F6, each waiting up to 3s per reply) interleave its
  // writes with a tone/volume preview's own E0/F4 off-then-on sequence:
  // whichever flow's writeCommand() call landed first won the wire, so a
  // preview tap that happened to land mid-poll could sit behind the poll's
  // full ~multi-second round trip before the device even received the "off"
  // frame — audibly indistinguishable from the old tone "finishing on its
  // own" before the new one started. Wrapping the whole poll sequence in the
  // same lock as triggerSound/triggerLight guarantees one flow always runs
  // to completion before the other begins, instead of interleaving.
  async pollStatusAndHistory() {
    await this.withCommandLock(async () => {
      await this.ensurePasswordVerified();
      const statusFrame = TaykieProtocol.buildFrame(CmdType.QueryStatus);
      await this.writeCommand(statusFrame, "F3 QueryStatus");
      await this.waitForReply(CmdType.QueryStatus);

      await this.ensurePasswordVerified();
      const historyFrame = TaykieProtocol.buildFrame(CmdType.QueryHistory);
      await this.writeCommand(historyFrame, "F6 QueryHistory");
      await this.waitForReply(CmdType.QueryHistory);
    });
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
