import { bleService } from "@/services/ble/BLEService";
import { useBLEStore } from "@/stores/bleStore";
import { DEFAULT_TONE_INDEX, DEFAULT_VOLUME_LEVEL, DEFAULT_LIGHT_TYPE } from "@/utils/toneAudio";

// The one FCM data.type that should trigger the physical device's speaker —
// social notifications (Like/Comment/Follow/etc.) show their banner/system
// notification as usual but must NOT also sound the pillbox.
export const DOSAGE_REMINDER_TYPE = "dosage_reminder";

export function isDosageReminder(remoteMessage: any): boolean {
  return remoteMessage?.data?.type === DOSAGE_REMINDER_TYPE;
}

// Triggers the connected Taykie device's speaker for a dosage reminder.
// Respects an explicit "Mute" tone choice (toneIndex === 0). The device
// never auto-stops F4 on its own — BLEService.triggerSound's own 60s safety
// timer is what eventually silences it if nothing else does, matching
// "plays continuously for up to a minute" for a real reminder (as opposed
// to the settings picker's brief preview).
export async function triggerDeviceSoundForReminder() {
  const { connectionStatus, toneIndex, volumeLevel } = useBLEStore.getState();
  // Logged unconditionally (not just on the early-return branches) so a
  // background-handler invocation that silently no-ops is still visible in
  // device logs — a call that never reaches this function at all (e.g. FCM
  // never invoking the JS background handler for a payload that also
  // carries a top-level "notification" field) is a different bug from one
  // that reaches here and bails.
  console.log(`🔊 triggerDeviceSoundForReminder called — connectionStatus=${connectionStatus}, toneIndex=${toneIndex}`);
  if (connectionStatus !== "connected") {
    console.warn("🔊 Skipped: BLE not connected in this JS context.");
    return;
  }

  const resolvedTone = toneIndex ?? DEFAULT_TONE_INDEX;
  if (resolvedTone <= 0) {
    console.warn("🔊 Skipped: tone is explicitly Mute.");
    return;
  }

  const resolvedVolume = volumeLevel ?? DEFAULT_VOLUME_LEVEL;
  // Volume is independently settable from tone (separate buttons on the
  // audio settings screen) — muting via volume alone must silence the
  // reminder too, not just an explicit Mute tone. Without this, volume=0
  // still sent an audible "on" frame at the quietest of 16 non-zero steps
  // (0xE0), since the protocol has no real silent volume — see triggerSound.
  if (resolvedVolume <= 0) {
    console.warn("🔊 Skipped: volume is explicitly Mute.");
    return;
  }

  try {
    await bleService.triggerSound(true, resolvedTone, resolvedVolume);
  } catch (e) {
    console.warn("Failed to trigger device sound for reminder:", e);
  }
}

export async function stopDeviceSoundForReminder() {
  if (useBLEStore.getState().connectionStatus !== "connected") return;
  try {
    await bleService.triggerSound(false, 0, 0);
  } catch {
    // Best-effort — the 60s safety timer covers this if it fails.
  }
}

// Triggers the connected Taykie device's light for a dosage reminder.
// Respects the "Reminder Light" setting — kept local in bleStore (like
// toneIndex/volumeLevel) rather than the backend notification-settings
// model, since light has no per-notification "mute" value to fall back on
// the way sound does, so a backend gap there would have silently disabled
// the light with no client-side way to turn it on. The device never
// auto-stops F5 on its own — BLEService.triggerLight's own 60s safety timer
// is what eventually turns it off if nothing else does.
export async function triggerDeviceLightForReminder() {
  const { connectionStatus, lightEnabled } = useBLEStore.getState();
  console.log(
    `💡 triggerDeviceLightForReminder called — connectionStatus=${connectionStatus}, lightEnabled=${lightEnabled}`,
  );
  if (!lightEnabled) {
    console.warn("💡 Skipped: reminder light is disabled in settings.");
    return;
  }
  if (connectionStatus !== "connected") {
    console.warn("💡 Skipped: BLE not connected in this JS context.");
    return;
  }

  try {
    await bleService.triggerLight(true, DEFAULT_LIGHT_TYPE);
  } catch (e) {
    console.warn("Failed to trigger device light for reminder:", e);
  }
}

export async function stopDeviceLightForReminder() {
  if (useBLEStore.getState().connectionStatus !== "connected") return;
  try {
    await bleService.triggerLight(false, 0x00);
  } catch {
    // Best-effort — the 60s safety timer covers this if it fails.
  }
}

// Quick blink preview shown right when the user switches "Reminder Light"
// on in Settings — confirms the toggle actually reaches the device
// immediately, rather than the user only finding out whether it worked at
// the next real reminder. No-op if not currently connected (nothing to
// preview against) — unlike triggerDeviceLightForReminder, this doesn't
// check the lightEnabled flag itself, since it's called exactly at the
// moment that flag is being turned on.
export async function flashDeviceLightPreview(blinkCount: number = 2) {
  if (useBLEStore.getState().connectionStatus !== "connected") return;
  try {
    for (let i = 0; i < blinkCount; i++) {
      await bleService.triggerLight(true, DEFAULT_LIGHT_TYPE);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await bleService.triggerLight(false, 0x00);
      if (i < blinkCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  } catch (e) {
    console.warn("Failed to flash device light preview:", e);
  }
}

// "Find My Taykie" — a slower, more deliberate pattern than the settings
// preview above, meant to actually be visible enough to locate the
// physical device. Per the factory's delivered feature spec
// (docs/Delivered_Feature_Description.md and
// docs/Taykie_BLE_Developer_Reference.md §7.6): tapping the device should
// blink 3 times, ending after 21 seconds — this reproduces that timing
// (3s on / 6s gap, x3 = 21s total). The docs don't specify a distinct
// light_type for this exact pattern separately from the 6 general-purpose
// types, so this reuses DEFAULT_LIGHT_TYPE as a best-effort trigger — worth
// confirming with the factory whether a dedicated type/timing exists.
export async function findTaykieDevice() {
  if (useBLEStore.getState().connectionStatus !== "connected") return;
  const BLINK_ON_MS = 3000;
  const BLINK_GAP_MS = 6000;
  const BLINK_COUNT = 3;
  try {
    for (let i = 0; i < BLINK_COUNT; i++) {
      await bleService.triggerLight(true, DEFAULT_LIGHT_TYPE);
      await new Promise((resolve) => setTimeout(resolve, BLINK_ON_MS));
      await bleService.triggerLight(false, 0x00);
      if (i < BLINK_COUNT - 1) {
        await new Promise((resolve) => setTimeout(resolve, BLINK_GAP_MS));
      }
    }
  } catch (e) {
    console.warn("Failed to run Find My Taykie light pattern:", e);
  }
}
