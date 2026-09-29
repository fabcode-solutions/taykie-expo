import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mmkvJSONStateStorage } from "./stateStorage";
// Module-level (not store state) since it's an opaque timer handle, not
// serializable UI state.
let devicePollInterval: ReturnType<typeof setInterval> | null = null;
// True while an F6 reply is being uploaded to the backend (see onHistoryReceived).
let historyUploadInFlight = false;
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
// The type/volume actually sounding on the device right now (as opposed to
// the type/volume being requested by the current tap). These can differ —
// e.g. tone A is playing and the user taps tone B — and the "off" frame
// must carry A's parameters, not B's, or the device has nothing to match
// against and leaves A playing until it finishes on its own. Undefined
// until the first preview starts.
let activePreviewType: number | undefined;
let activePreviewVolume: number | undefined;
// Serializes every mutation of activePreviewOn/previewOffTimer through one
// queue. setDeviceVolume and setDeviceTone each read activePreviewOn to
// decide whether to send an "off" before their "on" — but that check ran
// immediately on tap, before awaiting anything, so two taps close together
// (tone then volume, or two tone taps) could both see activePreviewOn still
// false and both skip the "off", sending back-to-back "on" F4 frames with
// no "off" between them. The device doesn't cleanly cut over between two
// "on" frames (see the comment below), so the second tap's tone silently
// queued up behind the first instead of interrupting it — audibly, the new
// tone only started once the first one finished playing on its own.
// Routing every preview command through this queue guarantees a later
// tap's "off" always runs after an earlier tap's "on" has fully landed.
let previewCommandQueue: Promise<void> = Promise.resolve();

function queuePreviewCommand<T>(fn: () => Promise<T>): Promise<T> {
  const run = previewCommandQueue.then(fn);
  previewCommandQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// Reflects a tone/volume tap's real device-confirmed (or failed) result into
// store state, then clears it back to null a moment later — unless a newer
// tap has already replaced this entry with its own, in which case this
// stale settle shouldn't stomp on it.
function settleAck(key: "toneAck" | "volumeAck", value: number, acked: boolean) {
  useBLEStore.setState({ [key]: { value, status: acked ? "confirmed" : "failed" } });
  setTimeout(() => {
    if (useBLEStore.getState()[key]?.value === value) {
      useBLEStore.setState({ [key]: null });
    }
  }, 1500);
}

// bit0=Sunday .. bit6=Saturday, per the protocol's weekday bitmask (see
// docs/Taykie_BLE_Developer_Reference.md §3.3). Schedule.scheduleDay is a
// full day name like "Monday" (date-fns `format(date, "EEEE")`, always
// English regardless of app locale).
const WEEKDAY_BIT_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// A schedule with multiple times (e.g. "07:30, 20:00") is selectable
// time-by-time rather than all-or-nothing, so each device slot needs its own
// selection identity distinct from its sibling times on the same schedule.
export function scheduleTimeKey(scheduleId: string, time: string): string {
  return `${scheduleId}::${time}`;
}

export interface ScheduleSyncResult {
  slotsUsed: number;
  syncedScheduleIds: string[];
  skippedScheduleIds: string[];
}

// Translates the app's own dosage schedules into the device's onboard F2
// slot format, so the physical device can fire reminders autonomously
// (using its own RTC) even with no phone/BLE connection at the time —
// unlike today's FCM-push-triggers-a-live-F4/F5 mechanism, which only works
// while actively connected. Only "daily"/"weekly" schedules are eligible —
// the protocol's weekday bitmask has no day-of-month concept, so "monthly"
// schedules can never be represented here and are always skipped. Each
// comma-separated time within a schedule (e.g. "07:30, 20:00" for
// twice-daily) is selected independently via scheduleTimeKey and needs its
// own slot, and the device has a hard cap of exactly SCHEDULE_SLOT_COUNT
// (10) slots total — selection beyond that is skipped rather than silently
// dropping an arbitrary schedule.
export function buildScheduleSlotsFromSchedules(
  schedules: Schedule[],
  selectedTimeKeys: string[],
  volumeByte: number,
  soundType: number,
  lightType: number,
): { slots: ScheduleSlot[]; result: ScheduleSyncResult } {
  const slots: ScheduleSlot[] = [];
  const syncedScheduleIds: string[] = [];
  const skippedScheduleIds: string[] = [];
  const selectedSet = new Set(selectedTimeKeys);

  for (const schedule of schedules) {
    const id = schedule.scheduleId ?? schedule.id;
    if (!id) continue;

    const times = (schedule.scheduleTime ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const selectedTimes = times.filter((time) => selectedSet.has(scheduleTimeKey(id, time)));
    if (selectedTimes.length === 0) continue; // nothing selected for this schedule at all

    if (schedule.scheduleType === "monthly") {
      skippedScheduleIds.push(id);
      continue;
    }

    const weekdayBitmask =
      schedule.scheduleType === "daily"
        ? 0x7f
        : schedule.scheduleDay && schedule.scheduleDay.toLowerCase() in WEEKDAY_BIT_INDEX
          ? 1 << WEEKDAY_BIT_INDEX[schedule.scheduleDay.toLowerCase()]
          : 0;
    if (!weekdayBitmask) {
      skippedScheduleIds.push(id);
      continue;
    }

    let addedAny = false;
    for (const time of selectedTimes) {
      if (slots.length >= SCHEDULE_SLOT_COUNT) break;
      const [hourStr, minuteStr] = time.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

      slots.push({
        enabled: true,
        weekdayBitmask,
        hour,
        minute,
        soundEnabled: schedule.remindersSound ?? true,
        lightEnabled: schedule.remindersLed ?? true,
        volume: volumeByte,
        soundType,
        lightType,
      });
      addedAny = true;
    }

    if (addedAny) {
      syncedScheduleIds.push(id);
    } else {
      skippedScheduleIds.push(id);
    }
  }

  const slotsUsed = slots.length;
  while (slots.length < SCHEDULE_SLOT_COUNT) {
    slots.push({ ...EMPTY_SCHEDULE_SLOT });
  }

  return { slots, result: { slotsUsed, syncedScheduleIds, skippedScheduleIds } };
}

function scheduleSlotsEqual(a: ScheduleSlot, b: ScheduleSlot): boolean {
  return (
    a.enabled === b.enabled &&
    a.weekdayBitmask === b.weekdayBitmask &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.soundEnabled === b.soundEnabled &&
    a.lightEnabled === b.lightEnabled &&
    a.volume === b.volume &&
    a.soundType === b.soundType &&
    a.lightType === b.lightType
  );
}

// setSchedule()'s own ack has turned out to be unreliable on real hardware —
// the device has been observed replying with a genuine-looking ChecksumError
// on every retry attempt while still actually committing the schedule to
// flash regardless. Trusting that NACK meant reporting "rejected" to the
// user even when the write fully succeeded. Reading the schedule back via F3
// and comparing it to what was actually intended is the only way to know
// the real outcome, so this is used instead of (not in addition to
// blindly trusting) the ack.
async function verifyScheduleApplied(intendedSlots: ScheduleSlot[]): Promise<boolean> {
  await bleService.queryStatus();
  await bleService.waitForReply(CmdType.QueryStatus);
  const applied = useBLEStore.getState().schedules;
  return intendedSlots.every((slot, i) => applied[i] && scheduleSlotsEqual(slot, applied[i]));
}

// Stops whatever's currently previewing (if anything) before starting the
// new tone/volume, then arms the auto-off timer — shared by setDeviceVolume
// and setDeviceTone since they trigger the same F4 SoundControl frame.
// Returns whether the device confirmed the user's actual selection (not the
// interrupting "stop the previous preview" call) — lets the caller show a
// real received/confirmed vs. failed indicator instead of assuming success.
async function runSoundPreview(
  soundType: number,
  volumeLevel: number,
  shouldPlay: boolean,
): Promise<boolean> {
  if (previewOffTimer) {
    clearTimeout(previewOffTimer);
    previewOffTimer = null;
  }
  if (activePreviewOn) {
    // Stop using the CURRENTLY SOUNDING type/volume, not the new
    // selection's — an off frame stamped with the new tone's bytes doesn't
    // match what's actually playing on the device.
    console.log(
      `🔊 runSoundPreview: interrupting active preview (type=${activePreviewType}, volume=${activePreviewVolume}) before new one`,
    );
    await bleService
      .triggerSound(false, activePreviewType ?? soundType, activePreviewVolume ?? volumeLevel)
      .catch(() => false);
    activePreviewOn = false;
  }
  console.log(
    `🔊 runSoundPreview: sending F4 — shouldPlay=${shouldPlay}, soundType=${soundType}, volumeLevel=${volumeLevel}`,
  );
  const acked = await bleService.triggerSound(shouldPlay, soundType, volumeLevel);
  console.log(`🔊 runSoundPreview: F4 acked=${acked}`);
  if (shouldPlay) {
    activePreviewOn = true;
    activePreviewType = soundType;
    activePreviewVolume = volumeLevel;
    previewOffTimer = setTimeout(() => {
      queuePreviewCommand(async () => {
        // A newer tap may have already turned this preview off (or
        // replaced it) by the time this timer fires — nothing to do.
        if (!activePreviewOn) return;
        await bleService.triggerSound(false, soundType, volumeLevel).catch(() => {});
        activePreviewOn = false;
        previewOffTimer = null;
      });
    }, PREVIEW_DURATION_MS);
  }
  return acked;
}

// Tracks a pending auto-reconnect attempt after an unexpected disconnect
// (see bleService.onDeviceDisconnected below) so a second unexpected drop —
// or a manual reconnect — cancels any earlier attempt still in flight.
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
// Backoff between auto-reconnect attempts after an unexpected drop (e.g. a
// lid-open triggering a brief power glitch on the BLE radio — see the F6/E0
// disconnect investigation). Short and few: this is for a brief physical
// glitch self-healing, not for chasing a device that's genuinely out of
// range or powered off.
const RECONNECT_DELAYS_MS = [1000, 3000, 6000];

function attemptReconnect(deviceId: string, attempt: number) {
  reconnectTimer = setTimeout(async () => {
    try {
      await useBLEStore.getState().connectToDevice(deviceId);
      reconnectTimer = null;
    } catch (error) {
      const isLastAttempt = attempt + 1 >= RECONNECT_DELAYS_MS.length;
      console.warn(
        `Auto-reconnect attempt ${attempt + 1}/${RECONNECT_DELAYS_MS.length} failed:`,
        error,
      );
      if (isLastAttempt) {
        reconnectTimer = null;
        useBLEStore.setState({ connectedDevice: null, connectionStatus: "disconnected" });
        stopBleForegroundService();
        return;
      }
      // connectToDevice's own failure path already set connectionStatus
      // back to "disconnected" — restore "connecting" so the UI doesn't
      // flicker between attempts.
      useBLEStore.setState({ connectionStatus: "connecting" });
      attemptReconnect(deviceId, attempt + 1);
    }
  }, RECONNECT_DELAYS_MS[attempt]);
}

import {
  bleService,
  TaykieDevice,
  DeviceData,
  ScheduleSlot,
  HistoryRecord,
  BLE_SCAN_DURATION_MS,
  DEFAULT_PASSWORD,
  CmdType,
} from "../services/ble/BLEService";
import {
  startBleForegroundService,
  stopBleForegroundService,
} from "../services/ble/bleForegroundService";
import {
  DEFAULT_TONE_INDEX,
  DEFAULT_VOLUME_LEVEL,
  DEFAULT_LIGHT_TYPE,
  volumePercentToByte,
} from "../utils/toneAudio";
import { SCHEDULE_SLOT_COUNT, EMPTY_SCHEDULE_SLOT } from "../services/ble/TaykieProtocol";
import type { Schedule } from "../types/schedule.types";
import * as Localization from "expo-localization";
import { useScheduleStore } from "./scheduleStore";
import {
  pairDevice,
  unpairDevice,
  updateBLEState,
  UpdateBLEStateRequest,
  startHistorySyncApi,
  uploadHistoryBatch,
  completeSyncSession,
} from "@/services/api/device";
import { queryClient } from "@/hooks/queries/queryClient";
import { lidEventKeys } from "@/hooks/queries/lidEvents";
import { notifyNewLidEvents } from "@/services/notifications.service";

interface BLEState {
  // Scanning state
  isScanning: boolean;
  scannedDevices: TaykieDevice[];

  // Connection state
  connectedDevice: TaykieDevice | null;
  connectionStatus: "connected" | "disconnected" | "connecting";
  // The BACKEND's own device record id (a UUID) — distinct from
  // connectedDevice.id, which is the raw BLE peripheral address (a MAC on
  // Android). Every per-device backend endpoint (ble-state, history sync,
  // unpair, ...) expects this UUID as `deviceId`, not the BLE address; using
  // the BLE address there fails backend validation ("deviceId must be a
  // valid UUID"). Captured from pairDevice()'s response, persisted so a
  // reconnect isn't stuck without it if a re-pair call happens to fail.
  pairedDeviceId: string | null;
  // scheduleTimeKey(scheduleId, time) entries the user has chosen to sync to
  // the device's onboard F2 slots — see buildScheduleSlotsFromSchedules. A
  // schedule with multiple times can have only some of them selected.
  // Persisted so the selection survives app restarts; re-syncable anytime
  // by changing this and calling syncSchedulesToDevice again (F2 always
  // rewrites the entire slot table, there's no incremental update).
  syncedTimeKeys: string[];
  // IANA zone (e.g. "Australia/Sydney") the device clock/slots were last
  // synced against — see resyncTimezoneIfChanged. Persisted so a fresh app
  // launch after traveling still knows a resync is owed, even before the
  // next BLE connect.
  // "<IANA zone>|<UTC offset minutes>" — the offset half is what actually
  // catches a DST transition (see resyncTimezoneIfChanged): the zone name
  // alone doesn't change across one ("Australia/Sydney" is the zone whether
  // or not DST is in effect).
  lastSyncedTimezone: string | null;
  // The device has no persistent per-record identifier of its own — each F6
  // history reply just restarts counting its records from 0. The backend
  // dedupes uploads on (deviceId, sequenceNumber), so reusing 0-based indices
  // on every sync would make genuinely new events (after a device flash
  // erase) look like duplicates of the previous sync and get silently
  // dropped. This offset keeps climbing across syncs so sequenceNumber stays
  // unique for the life of the device. Persisted so it survives app restarts.
  historySequenceOffset: number;
  // The device's own BLE auth password (E0/E1), NOT the user's app account
  // password — starts at the factory default and only ever changes via
  // changeDevicePassword. Persisted so a fresh app launch still knows how to
  // authenticate after a password change; see BLEService.setPassword.
  devicePassword: string;

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
  // Transient, not persisted — reflects whether the device's own reply
  // confirmed the most recent tap on that specific tone/volume value, so
  // the UI can show a real received/confirmed/failed state per button
  // instead of assuming the tap worked the instant it's sent. Cleared back
  // to null a moment after settling so the indicator doesn't linger.
  toneAck: { value: number; status: "pending" | "confirmed" | "failed" } | null;
  volumeAck: { value: number; status: "pending" | "confirmed" | "failed" } | null;
  // Whether a dosage reminder should also flash the device's LED. Kept
  // local (like toneIndex/volumeLevel) rather than round-tripped through
  // the backend's notification-settings model — that field has no
  // per-notification fallback the way sound has "Mute", so a backend gap
  // there would silently disable the light with no client-side way to
  // turn it on. Defaults to on since there's no "Mute" equivalent to fall
  // back to.
  lightEnabled: boolean;
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
  setLightEnabled: (enabled: boolean) => void;
  toggleScheduleSlot: (index: number) => Promise<void>;
  setSyncedTimeKeys: (keys: string[]) => void;
  syncSchedulesToDevice: (schedules: Schedule[]) => Promise<ScheduleSyncResult>;
  resyncTimezoneIfChanged: () => Promise<void>;
  startHistorySync: () => Promise<void>;
  // Lightweight compartment-activity refresh: queries the device directly
  // without requiring a backend sync session, for on-screen display.
  refreshCompartmentActivity: () => Promise<void>;
  // Destructive: wipes the device's history. See implementation comment.
  eraseHistory: () => Promise<void>;
  renameDevice: (name: string) => Promise<void>;
  // Verifies currentPassword against the device (not just our own persisted
  // copy) before sending the change, so a stale local record can't lock the
  // user out. Throws with a user-facing message on either failure.
  changeDevicePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  reset: () => void;
}

const initialState = {
  isScanning: false,
  scannedDevices: [],
  connectedDevice: null,
  connectionStatus: "disconnected" as const,
  pairedDeviceId: null,
  syncedTimeKeys: [],
  lastSyncedTimezone: null,
  historySequenceOffset: 0,
  devicePassword: DEFAULT_PASSWORD,
  deviceData: null,

  // Taykie specific state
  batteryLevel: null,
  isCharging: false,
  toneIndex: null,
  volumeLevel: null,
  toneAck: null,
  volumeAck: null,
  lightEnabled: true,
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
          // Seed the service with whatever password this device currently
          // expects — persisted, since it survives a factory-default 000000
          // being changed via changeDevicePassword. Every command re-verifies
          // via this value (see BLEService.ensurePasswordVerified), so this
          // must happen before any connect/reconnect below.
          bleService.setPassword(get().devicePassword);

          // 1. Check Permissions
          const hasPermissions = await bleService.requestPermissions();
          const isBluetoothEnabled = await bleService.isBluetoothEnabled();

          set({ hasPermissions, isBluetoothEnabled });

          // iOS only: the OS silently killed and relaunched the app while a
          // peripheral was still linked natively — re-run the normal connect
          // flow against that same peripheral id to re-establish this store's
          // own state (password verify, status poll, backend pairing sync,
          // foreground-service-equivalent handling, ...), since a fresh JS
          // instance otherwise has no idea a connection already exists.
          bleService.onStateRestored = (restoredDeviceIds) => {
            const [restoredId] = restoredDeviceIds;
            if (restoredId && get().connectionStatus !== "connected") {
              get().connectToDevice(restoredId);
            }
          };

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

            // The backend's own device id (a UUID) — NOT connectedDevice.id,
            // which is the raw BLE MAC address and gets rejected by this
            // endpoint's validation ("deviceId must be a valid UUID"). Not yet
            // set on a brand-new device's very first status reply (which can
            // arrive before pairDevice() resolves) — skipping in that case is
            // correct, not a bug: every later poll cycle (every 15s) will have
            // it by then.
            const currentDeviceId = get().pairedDeviceId;
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
                  soundEnabled: slot.soundEnabled,
                  lightEnabled: slot.lightEnabled,
                  volume: slot.volume,
                  soundType: slot.soundType,
                  lightType: slot.lightType,
                })),
              };
              await updateBLEState(currentDeviceId, requestBody);
            }
          };

          // History records arrive as a single reply to the F6 query. The
          // backend's session-start call needs the real record count up front
          // (totalRecords), which we only learn once this reply arrives — so
          // the whole session lifecycle (start -> upload -> complete) lives
          // here rather than around the F6 request itself.
          bleService.onHistoryReceived = async (records) => {
            // Always surface what the device returned, regardless of whether a
            // backend sync session is active — the on-screen activity list
            // shouldn't depend on backend availability.
            const sorted = [...records].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            set({ historyRecords: sorted });

            // Backend's own device id (UUID) — see the comment on
            // onStatusUpdated above for why connectedDevice.id (the BLE
            // address) can't be used for backend calls.
            const { pairedDeviceId, isSyncingHistory } = get();
            if (!pairedDeviceId) return;

            // The periodic poll reads history without a manual sync running.
            // The device only logs lid opens (it never pushes them), so this
            // read is the only way the app learns of one: any records here must
            // go to the backend, which turns them into lid events and triggers
            // the "What did you do?" notification. Nothing to do when empty.
            if (!isSyncingHistory) {
              if (records.length === 0) return;
              set({ isSyncingHistory: true, historyProgress: 0, historyTotal: 0 });
            }

            // A poll can land while the previous upload is still running
            // (upload + erase take a few seconds); a second concurrent run
            // would upload the same unerased records twice.
            if (historyUploadInFlight) return;
            historyUploadInFlight = true;

            let sessionId: string | null = null;
            try {
              set({ historyTotal: records.length, historyProgress: 0 });

              const sessionResponse = await startHistorySyncApi(pairedDeviceId, records.length);
              sessionId =
                sessionResponse?.sessionId ||
                sessionResponse?.data?.id ||
                sessionResponse?.data?.sessionId ||
                sessionResponse?.id ||
                null;
              if (!sessionId) throw new Error("Backend did not return a valid Sync Session ID");
              set({ syncSessionId: sessionId });

              if (records.length > 0) {
                // The device has no per-record sequence number of its own, and
                // it restarts counting from 0 on every F6 reply — so a running
                // offset (persisted across app restarts) is what keeps
                // sequenceNumber unique for this device across multiple syncs,
                // matching what the backend's dedup index actually needs.
                const offset = get().historySequenceOffset;
                const mappedRecords = records.map((r, index) => ({
                  sequenceNumber: offset + index,
                  eventAt: r.timestamp,
                }));

                const uploadResponse = await uploadHistoryBatch({
                  deviceId: pairedDeviceId,
                  sessionId,
                  records: mappedRecords,
                });

                // Lid opens found in this batch: notify for fresh ones, and refresh
                // the unconfirmed list (missed opens stay silent, brief P1.7).
                // LidOpenPrompt (the in-app modal) reacts to this same
                // invalidated query on its own — it isn't triggered from here.
                await notifyNewLidEvents(uploadResponse?.data?.lidEvents ?? []);
                queryClient.invalidateQueries({ queryKey: lidEventKeys.all });

                set({ historySequenceOffset: offset + records.length });
                console.log("Backend saved", records.length, "history records");

                // F6 (Query History) is documented as a plain read — it does not
                // clear anything on its own, only FF (Erase Flash) does. Without
                // this, every future sync re-reads the same records the device
                // has already reported and — now that sequenceNumber keeps
                // climbing across syncs instead of resetting — they'd land as
                // brand new rows in the backend's permanent history instead of
                // being deduped, i.e. actual duplicates. Only erase after the
                // backend has durably stored them; a failed erase here just
                // means the same records get harmlessly re-synced next time.
                try {
                  await bleService.eraseHistoryFlash();
                } catch (eraseError) {
                  console.error(
                    "History synced to backend but failed to erase device flash — records will reappear on the next sync:",
                    eraseError,
                  );
                }
              }

              set({ historyProgress: records.length });

              await completeSyncSession({
                deviceId: pairedDeviceId,
                sessionId,
                status: "completed",
              });
              historyUploadInFlight = false;
              set({ isSyncingHistory: false, syncSessionId: null });
            } catch (error) {
              console.error("Failed to save history records:", error);
              if (sessionId) {
                try {
                  await completeSyncSession({
                    deviceId: pairedDeviceId,
                    sessionId,
                    status: "failed",
                  });
                } catch (completeError) {
                  console.error("Failed to mark sync session as failed:", completeError);
                }
              }
              historyUploadInFlight = false;
              set({ isSyncingHistory: false, syncSessionId: null });
            }
          };

          // Fires on both a user-initiated disconnect and an unexpected link
          // drop — either way the last-known device data is now stale, so
          // clear it rather than leaving the UI showing a frozen snapshot. An
          // unexpected drop (wasIntentional false — out of range, a lid-open
          // power glitch, etc.) additionally kicks off a short auto-reconnect
          // attempt rather than dumping the user back to "disconnected" and
          // requiring a manual re-pair for what's often a brief glitch.
          bleService.onDeviceDisconnected = (wasIntentional) => {
            if (devicePollInterval) {
              clearInterval(devicePollInterval);
              devicePollInterval = null;
            }
            if (previewOffTimer) {
              clearTimeout(previewOffTimer);
              previewOffTimer = null;
            }
            activePreviewOn = false;
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }

            const lostDevice = get().connectedDevice;
            const shouldReconnect = !wasIntentional && !!lostDevice;

            set({
              // Keep the device id/name around while we're about to retry so
              // the UI can still say which device it's reconnecting to; a
              // failed final attempt (or an intentional disconnect) clears it.
              connectedDevice: shouldReconnect ? lostDevice : null,
              connectionStatus: shouldReconnect ? "connecting" : "disconnected",
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

            if (shouldReconnect) {
              attemptReconnect(lostDevice.id, 0);
            } else {
              // Intentional disconnect, or an unexpected drop with no device to
              // retry — nothing more will attempt to reconnect, so the process
              // no longer needs foreground protection.
              stopBleForegroundService();
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
        // More than one mounted screen can call this at once (e.g. the Device
        // tab's own "scan while disconnected" effect, plus the dedicated
        // pair-device screen's mount effect) — since scannedDevices is shared
        // global state, a second caller resetting it to [] would wipe out
        // whatever the first caller's in-progress scan had already found.
        // Bailing out here lets the already-running scan keep populating the
        // one shared list instead of each caller racing to restart it.
        if (get().isScanning) return;

        set({ isScanning: true, scannedDevices: [] });

        try {
          await bleService.startScan((device) => {
            set((state) => {
              const exists = state.scannedDevices.some((d) => d.id === device.id);

              if (exists) {
                return {
                  scannedDevices: state.scannedDevices.map((d) =>
                    d.id === device.id ? device : d,
                  ),
                  // Removed isScanning: false here to prevent UI flash
                };
              }

              return {
                scannedDevices: [...state.scannedDevices, device],
                // Removed isScanning: false here to prevent UI flash
              };
            });
          });

          // Matches BLEService's own scan-duration timeout — previously this was
          // a shorter, independent 10s here vs. the real 15s scan, so the UI
          // said "not scanning" for 5s while the radio (and any late-arriving
          // second/third device) was still actually being discovered.
          setTimeout(() => {
            set({ isScanning: false });
          }, BLE_SCAN_DURATION_MS);
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
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
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

          // Android-only: keeps this process alive in the background (even if
          // the user swipes the app from Recents) for as long as a connection
          // is active or being retried — see bleForegroundService.ts. No-op on
          // iOS, where a manual force-quit can't be worked around regardless.
          startBleForegroundService();

          // Bonding is intentionally NOT requested here anymore — requesting an
          // OS-level bond on an already-active GATT connection forces a brief
          // security renegotiation at the radio level, which was confirmed (in
          // testing) to interrupt an in-flight write and cause a real
          // "unexpected disconnect", with the bond request itself never
          // resolving (no BOND_BONDED/BOND_NONE broadcast ever arrived) —
          // consistent with the firmware not supporting bonding at all. Not
          // worth the connection-stability cost for a feature that's never once
          // succeeded. See services/ble/bleBond.ts's requestBond() if this is
          // worth retrying manually later (e.g. a debug menu action) once the
          // factory confirms firmware support.

          // The device doesn't push updates in real time (compartment events
          // are only logged, not streamed) — poll status + history periodically
          // so battery, schedules, and lid activity don't go stale until the
          // next manual refresh or reconnect.
          if (devicePollInterval) clearInterval(devicePollInterval);
          let isPolling = false;
          devicePollInterval = setInterval(async () => {
            if (isPolling) return;
            // Skip this cycle entirely while a tone/volume preview is actively
            // sounding or mid-switch — see runSoundPreview/activePreviewOn.
            // pollStatusAndHistory now shares triggerSound's withCommandLock, so
            // starting it here would just queue behind the lock rather than
            // interleave, but a poll already ahead in that queue still delays a
            // user's tap by a full ~multi-second round trip. Deferring one 15s
            // cycle is free; a laggy tone switch is not.
            if (activePreviewOn) return;
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
              // replies (see BLEService.waitForReply). The whole sequence now
              // runs under BLEService's withCommandLock (pollStatusAndHistory)
              // so it can't interleave with a triggerSound/triggerLight call —
              // see the comment on that method for why.
              await bleService.pollStatusAndHistory();

              // Cheap early-return when nothing changed (see
              // resyncTimezoneIfChanged) — piggybacking on this existing 15s
              // cycle is what catches a DST transition passing at 2am while
              // the app stays foregrounded the whole time, since that never
              // fires an AppState "active" event on its own.
              void get().resyncTimezoneIfChanged();
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
            const pairResponse = await pairDevice({
              name: device.name || "Taykie Pill Box",
              blePeripheralId: device.id,
            });
            // This is the backend's own record id (a UUID) — NOT the same
            // value as device.id (the raw BLE MAC address). Every per-device
            // backend endpoint (ble-state, history sync, unpair, ...) needs
            // this one; using the BLE address there gets rejected with
            // "deviceId must be a valid UUID".
            if (pairResponse?.data?.id) {
              set({ pairedDeviceId: pairResponse.data.id });
            }
          } catch (pairError) {
            console.warn("Backend device pairing failed (BLE connection still active):", pairError);
          }

          // Covers reconnecting after traveling with the app closed the whole
          // time — the phone's zone may have changed since the last sync and
          // this is the first chance to catch it, independent of the
          // AppState-driven check for a zone change mid-session.
          void get().resyncTimezoneIfChanged();
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
          // A reconnect attempt may currently be scheduled (mid-backoff, with
          // no live native connection for bleService.disconnect() to tear
          // down) — clear it explicitly so it can't fire later and silently
          // undo this manual disconnect.
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          await bleService.disconnect();
          set({
            connectedDevice: null,
            connectionStatus: "disconnected",
          });
          stopBleForegroundService();
        } catch (error) {
          console.error("Disconnect error:", error);
        }
      },

      forgetDevice: async () => {
        try {
          if (!get().connectedDevice) return;

          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          // Backend's own device id (UUID) — see onStatusUpdated's comment for
          // why connectedDevice.id (the BLE address) can't be used here. Still
          // proceed with the local disconnect below even if this is missing —
          // the user should be able to forget a device locally regardless of
          // backend pairing state.
          const pairedDeviceId = get().pairedDeviceId;
          if (pairedDeviceId) {
            await unpairDevice(pairedDeviceId); // Delete from backend
          }
          await bleService.disconnect(); // Disconnect Bluetooth
          set({
            connectedDevice: null,
            connectionStatus: "disconnected",
            pairedDeviceId: null,
          });
          stopBleForegroundService();
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
        set({ volumeLevel, volumeAck: { value: volumeLevel, status: "pending" } });
        try {
          // Nullish coalescing, not || — an explicit Mute tone (0) must stay 0,
          // not get silently overridden with a fallback "real" tone the user
          // never picked. Unset (null) still resolves to Mute (see
          // DEFAULT_TONE_INDEX), which is the correct default now too.
          const toneIndex = get().toneIndex ?? DEFAULT_TONE_INDEX;
          // Only actually play if BOTH tone and volume are non-Mute — an
          // explicit Mute on either axis means no sound, regardless of which
          // one the user is currently adjusting.
          const shouldPlay = toneIndex > 0 && volumeLevel > 0;
          console.log(
            `🔊 setDeviceVolume(${volumeLevel}) — toneIndex=${toneIndex}, shouldPlay=${shouldPlay}`,
          );

          // Queued (not awaited directly against activePreviewOn here) so a
          // tap that lands while an earlier tap's own preview command is still
          // in flight always sees that command's final state instead of racing
          // it — see runSoundPreview's comment.
          const acked = await queuePreviewCommand(() =>
            runSoundPreview(toneIndex, volumeLevel, shouldPlay),
          );
          console.log(`🔊 setDeviceVolume(${volumeLevel}) settled — acked=${acked}`);
          settleAck("volumeAck", volumeLevel, acked);
        } catch (error) {
          console.error("Failed to set volume:", error);
          settleAck("volumeAck", volumeLevel, false);
        }
      },

      setDeviceTone: async (toneIndex: number) => {
        set({ toneIndex, toneAck: { value: toneIndex, status: "pending" } });
        try {
          // Nullish coalescing, not || — an explicit Mute volume (0) must stay
          // 0, not get silently overridden back up to an audible default. This
          // was the direct cause of sound still playing on a tone change even
          // when volume was set to Mute.
          const volumeLevel = get().volumeLevel ?? DEFAULT_VOLUME_LEVEL;
          // Only actually play if BOTH tone and volume are non-Mute.
          const shouldPlay = toneIndex > 0 && volumeLevel > 0;

          // Queued — see setDeviceVolume above for why.
          const acked = await queuePreviewCommand(() =>
            runSoundPreview(toneIndex, volumeLevel, shouldPlay),
          );
          settleAck("toneAck", toneIndex, acked);
        } catch (error) {
          settleAck("toneAck", toneIndex, false);
          console.error("Failed to set tone:", error);
        }
      },

      setLightEnabled: (enabled: boolean) => set({ lightEnabled: enabled }),

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
          const applied = await verifyScheduleApplied(updatedSchedules);
          if (!applied) throw new Error("Device did not accept the schedule update.");
          set({ schedules: updatedSchedules });
        } catch (error) {
          console.error("Failed to toggle schedule:", error);
          set({ schedules: previousSchedules });
        }
      },

      setSyncedTimeKeys: (keys: string[]) => set({ syncedTimeKeys: keys }),

      // Writes the app's own dosage schedules (filtered to the user's
      // `syncedTimeKeys` per-time selection) into the device's onboard F2 slots —
      // see buildScheduleSlotsFromSchedules for the translation rules
      // (daily/weekly only, up to 10 slots total, current tone/volume/light
      // settings reused per slot). Callers should surface
      // `result.skippedScheduleIds` to the user (e.g. a monthly schedule that
      // can never be represented, or one that didn't fit within the 10-slot cap).
      syncSchedulesToDevice: async (schedules: Schedule[]) => {
        const { syncedTimeKeys, volumeLevel, toneIndex } = get();
        const volumeByte = volumePercentToByte(volumeLevel ?? DEFAULT_VOLUME_LEVEL);
        const soundType = toneIndex ?? DEFAULT_TONE_INDEX;

        const { slots, result } = buildScheduleSlotsFromSchedules(
          schedules,
          syncedTimeKeys,
          volumeByte,
          soundType,
          DEFAULT_LIGHT_TYPE,
        );

        await bleService.setSchedule(slots);
        const applied = await verifyScheduleApplied(slots);
        if (!applied) {
          throw new Error("Device didn't accept the schedule sync. Please try again.");
        }
        set({ schedules: slots });
        return result;
      },

      // Brief §Priority 2.4/2.5: reminders must follow the phone's local time
      // across both an actual timezone change AND a DST transition, and both
      // the device clock and the on-device reminder slots need resyncing
      // "whenever the app connects and whenever the phone's timezone changes".
      // The clock half of "on connect" already happens unconditionally inside
      // bleService.connectToDevice (F1 TimeCalibration runs on every connect,
      // encoding the phone's current local time regardless of whether the zone
      // actually changed) — this covers the other two cases: the on-device
      // slots also need rewriting after a zone/offset change (their hour/minute
      // bytes were written for the *old* offset), and that change can happen
      // while already connected (e.g. the phone's auto-timezone updates
      // mid-flight, or a DST transition passes at 2am with the app connected
      // overnight), with no reconnect to hang a resync off. Called on every
      // connect and from an AppState listener (see app/_layout.tsx) so a
      // foreground while already connected also catches it.
      //
      // IMPORTANT: DST is not a zone change — "Australia/Sydney" is the same
      // IANA zone whether or not DST is in effect, only its UTC offset shifts
      // twice a year (Brisbane's "Australia/Brisbane" never observes DST at
      // all, so it never shifts). Comparing zone names alone would silently
      // miss every DST transition, which is exactly the case the brief calls
      // out to test — so the fingerprint below includes the current UTC
      // offset, not just the zone name.
      resyncTimezoneIfChanged: async () => {
        if (get().connectionStatus !== "connected") return;

        let currentFingerprint: string | null = null;
        try {
          const zone = Localization.getCalendars()[0]?.timeZone ?? null;
          if (!zone) return;
          const offsetMinutes = -new Date().getTimezoneOffset(); // sign-flipped to UTC+N convention
          currentFingerprint = `${zone}|${offsetMinutes}`;
        } catch (error) {
          console.warn("Failed to read device timezone:", error);
          return;
        }

        const { lastSyncedTimezone, syncedTimeKeys } = get();
        if (currentFingerprint === lastSyncedTimezone) return; // nothing to do

        try {
          // Re-stamp the clock explicitly rather than relying on the last
          // connect's F1 — this can fire minutes or hours after connecting.
          await bleService.syncTime();

          if (syncedTimeKeys.length > 0) {
            // The device's F2 slots store hour/minute only, no zone of their
            // own — every slot needs rewriting in the new local time, not
            // just the clock. Re-fetch schedules rather than trusting
            // whatever's cached in scheduleStore, since this can fire a long
            // time after that store was last populated.
            const scheduleStore = useScheduleStore.getState();
            await scheduleStore.fetchUserSchedules(true);
            await get().syncSchedulesToDevice(useScheduleStore.getState().userSchedules);
          }

          set({ lastSyncedTimezone: currentFingerprint });
        } catch (error) {
          // Leave lastSyncedTimezone stale so the next connect/foreground
          // retries rather than silently giving up on a failed resync.
          console.error("Timezone resync failed:", error);
        }
      },

      startHistorySync: async () => {
        if (get().isSyncingHistory) return;
        try {
          // Backend's own device id (UUID) — see onStatusUpdated's comment for
          // why connectedDevice.id (the BLE address) can't be used here.
          const currentDeviceId = get().pairedDeviceId;
          if (!currentDeviceId) throw new Error("No active device connected.");

          // The backend session can't be opened yet — it needs the real record
          // count (totalRecords), which we only learn once the device replies.
          // Setting isSyncingHistory here is what tells onHistoryReceived (in
          // initBLE) to open/upload/complete the session once that reply lands.
          set({ isSyncingHistory: true, historyProgress: 0, historyTotal: 0 });

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

        const pairResponse = await pairDevice({ name: trimmed, blePeripheralId: device.id });
        set({
          connectedDevice: { ...device, name: trimmed },
          ...(pairResponse?.data?.id ? { pairedDeviceId: pairResponse.data.id } : {}),
        });
      },

      changeDevicePassword: async (currentPassword: string, newPassword: string) => {
        if (get().connectionStatus !== "connected") {
          throw new Error("Connect to your Taykie device first.");
        }
        const { verified, changed } = await bleService.changePassword(currentPassword, newPassword);
        if (!verified) throw new Error("Current password is incorrect.");
        if (!changed) throw new Error("Device rejected the new password. Please try again.");
        set({ devicePassword: newPassword });
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
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        activePreviewOn = false;
        set(initialState);
      },
    }),
    {
      name: "ble-store",
      storage: mmkvJSONStateStorage,
      // Only the user's tone/volume preference (plus the backend device id
      // — see its own comment above) survives a restart — every other field
      // (connection state, battery, schedules, history, ...) is live device
      // data that would just be stale/wrong if persisted.
      partialize: (state) => ({
        toneIndex: state.toneIndex,
        volumeLevel: state.volumeLevel,
        lightEnabled: state.lightEnabled,
        pairedDeviceId: state.pairedDeviceId,
        syncedTimeKeys: state.syncedTimeKeys,
        lastSyncedTimezone: state.lastSyncedTimezone,
        historySequenceOffset: state.historySequenceOffset,
        devicePassword: state.devicePassword,
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
