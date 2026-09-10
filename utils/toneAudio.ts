import { Audio } from "expo-av";

// Shared between the Device screen's tone picker (BLE device buzzer) and
// the in-app notification banner — both use the same set of local .wav
// previews, keyed by the same tone index used in the BLE F4 SoundControl
// payload (0 = Mute). Exactly 6 values (0-5) — matching the protocol docs'
// documented snd_type range (docs/Smart_Pill_Box_Communication_Protocol_EN.md,
// docs/Taykie_BLE_Developer_Reference.md §7.1) and the Features doc's "5
// types" (5 real tones + Mute). A 7th tone ("shift", value 6) used to be
// listed here — sending soundType 6 to the device violated the documented
// 0x00-0x05 range and was removed.
export const TONE_OPTIONS = [
  { label: "mute", value: 0 },
  { label: "taykie", value: 1 },
  { label: "verve", value: 2 },
  { label: "echo", value: 3 },
  { label: "pulse", value: 4 },
  { label: "nudge", value: 5 },
] as const;

const TONE_FILES: Record<string, any> = {
  Taykie: require("@/assets/audio/taykie.wav"),
  Verve: require("@/assets/audio/verve.wav"),
  Echo: require("@/assets/audio/echo.wav"),
  Pulse: require("@/assets/audio/pulse.wav"),
  Nudge: require("@/assets/audio/nudge.wav"),
};

// Fallback used everywhere a tone/volume hasn't been explicitly chosen yet
// (toneIndex/volumeLevel is null/undefined — before the user has ever
// visited the picker). Previously both defaulted to Mute (0) — but since
// tone and volume are independent axes gating each other
// (shouldPlay = tone>0 && volume>0 in bleStore's setDeviceTone/Volume),
// that meant EITHER control alone always did nothing on a fresh
// install/reconnect until the OTHER one had also been touched at least
// once — which looked exactly like "volume doesn't work" when testing just
// one picker. It also meant real dosage reminders stayed silent by default
// until a user happened to visit the audio settings screen at all. Both
// now default to a real, audible value so sound works out of the box.
export const DEFAULT_TONE_INDEX = 1; // "taykie"
// A 0-100 percentage now (was 0-5) — see the volume slider in device.tsx
// and BLEService.triggerSound's byte scaling, which maps this range onto
// the protocol's real 16-step (0xE0-0xEF) volume byte.
export const DEFAULT_VOLUME_LEVEL = 60;
// No protocol documentation distinguishes light "colors" 0x01-0x05 from
// each other (unlike sound's TONE_OPTIONS) — 0x01 is used as the on-value
// here since 0x00 is reserved for "off" everywhere else in the protocol.
// Shared by reminderSound.ts's live light triggers and the device
// schedule-sync F2 slot builder.
export const DEFAULT_LIGHT_TYPE = 0x01;

// The highest volume level the UI exposes (device.tsx's volume slider is
// 0-100%) — used to scale that range onto the protocol's real 0xE0-0xEF
// (0-15) volume byte. Shared by BLEService.triggerSound (live preview/
// reminder triggers) and the device schedule-sync builder (F2 slots), so
// both always compute the identical byte for the same percentage instead
// of risking two independently-maintained copies drifting apart.
const MAX_UI_VOLUME_LEVEL = 100;

export function volumePercentToByte(percent: number): number {
  const clamped = Math.min(MAX_UI_VOLUME_LEVEL, Math.max(0, percent));
  return 0xe0 + Math.round((clamped / MAX_UI_VOLUME_LEVEL) * 0x0f);
}

export function toneLabelForIndex(toneIndex: number | null | undefined): string {
  const resolvedIndex = toneIndex ?? DEFAULT_TONE_INDEX;
  return TONE_OPTIONS.find((t) => t.value === resolvedIndex)?.label ?? "Mute";
}

// The filename as bundled via app.config.ts's expo-notifications `sounds`
// array — used to set a real system notification sound (Android channel /
// iOS notification content), not just local expo-av preview playback.
// Returns null only for an explicit "Mute" choice — unset falls back to the
// default tone above, same as toneLabelForIndex.
export function toneFileName(toneIndex: number | null | undefined): string | null {
  const label = toneLabelForIndex(toneIndex);
  console.log("label=-----",label)
  return label === "Mute" ? null : `${label}.wav`;
}

// A filesystem/channel-id-safe slug for the tone, e.g. "taykie". Used to
// make Android notification channel ids unique per tone, since a channel's
// sound can't be changed after creation — switching tones means creating a
// new channel rather than updating the old one.
export function toneSlug(toneIndex: number | null | undefined): string {
  return toneLabelForIndex(toneIndex).toLowerCase();
}

// Plays a tone by label (e.g. "Taykie"); "Mute" or an unknown label plays
// nothing and resolves to null. Caller owns the returned Sound and must
// pass it to stopTone() when done (looped tones in particular will keep
// playing until explicitly stopped).
export async function playTone(
  toneLabel: string,
  options: { volumeLevel?: number; loop?: boolean } = {},
): Promise<Audio.Sound | null> {
  const soundFile = TONE_FILES[toneLabel];
  if (!soundFile) return null;

  const { volumeLevel = DEFAULT_VOLUME_LEVEL, loop = false } = options;
  // Explicit Mute volume (0) means no sound at all, not "play at 0 gain" —
  // skip creating/loading the sound entirely.
  if (volumeLevel <= 0) return null;

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const { sound } = await Audio.Sound.createAsync(soundFile, {
    isLooping: loop,
    volume: Math.min(100, Math.max(0, volumeLevel)) / 100,
    shouldPlay: true,
  });

  return sound;
}

export async function stopTone(sound: Audio.Sound | null) {
  if (!sound) return;
  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch {
    // Already unloaded/not loaded — nothing to clean up.
  }
}