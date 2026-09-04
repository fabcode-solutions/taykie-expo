import { Audio } from "expo-av";

// Shared between the Device screen's tone picker (BLE device buzzer) and
// the in-app notification banner — both use the same set of local .wav
// previews, keyed by the same tone index used in the BLE F4 SoundControl
// payload (0 = Mute).
export const TONE_OPTIONS = [
  { label: "mute", value: 0 },
  { label: "taykie", value: 1 },
  { label: "verve", value: 2 },
  { label: "echo", value: 3 },
  { label: "pulse", value: 4 },
  { label: "nudge", value: 5 },
  { label: "shift", value: 6 },
] as const;

const TONE_FILES: Record<string, any> = {
  Taykie: require("@/assets/audio/taykie.wav"),
  Verve: require("@/assets/audio/verve.wav"),
  Echo: require("@/assets/audio/echo.wav"),
  Pulse: require("@/assets/audio/pulse.wav"),
  Nudge: require("@/assets/audio/nudge.wav"),
  Shift: require("@/assets/audio/shift.wav"),
};

// Fallback used everywhere a tone/volume hasn't been explicitly chosen yet
// (toneIndex/volumeLevel is null/undefined — before the user has ever
// visited the picker). Unset now resolves to the same value as an explicit
// "Mute" choice (0) — a fresh install/reconnect should be silent by
// default, not default to an audible tone/volume the user never picked.
export const DEFAULT_TONE_INDEX = 0; // "Mute"
export const DEFAULT_VOLUME_LEVEL = 0; // "Mute"

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
    volume: Math.min(5, Math.max(0, volumeLevel)) / 5,
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