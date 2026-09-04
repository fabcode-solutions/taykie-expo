import { bleService } from "@/services/ble/BLEService";
import { useBLEStore } from "@/stores/bleStore";
import { DEFAULT_TONE_INDEX, DEFAULT_VOLUME_LEVEL } from "@/utils/toneAudio";

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
