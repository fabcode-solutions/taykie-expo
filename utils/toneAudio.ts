import { Audio } from "expo-av";

// Shared between the Device screen's tone picker (BLE device buzzer) and
// the in-app notification banner — both use the same set of local .wav
// previews, keyed by the same tone index used in the BLE F4 SoundControl
// payload (0 = Mute).
export const TONE_OPTIONS = [
  { label: "Mute", value: 0 },
  { label: "Taykie", value: 1 },
  { label: "Verve", value: 2 },
  { label: "Echo", value: 3 },
  { label: "Pulse", value: 4 },
  { label: "Nudge", value: 5 },
  { label: "Shift", value: 6 },
] as const;

const TONE_FILES: Record<string, any> = {
  Taykie: require("@/assets/audio/Taykie.wav"),
  Verve: require("@/assets/audio/Verve.wav"),
  Echo: require("@/assets/audio/Echo.wav"),
  Pulse: require("@/assets/audio/Pulse.wav"),
  Nudge: require("@/assets/audio/Nudge.wav"),
  Shift: require("@/assets/audio/Shift.wav"),
};

// Fallback used everywhere a tone/volume hasn't been explicitly chosen yet
// (toneIndex/volumeLevel is null/undefined — before the user has ever
// visited the picker). This is distinct from an explicit choice of "Mute"
// (toneIndex === 0) or volume 0, which are respected as real selections.
export const DEFAULT_TONE_INDEX = 1; // "Taykie"
export const DEFAULT_VOLUME_LEVEL = 1;

export function toneLabelForIndex(toneIndex: number | null | undefined): string {
  const resolvedIndex = toneIndex ?? DEFAULT_TONE_INDEX;
  return TONE_OPTIONS.find((t) => t.value === resolvedIndex)?.label ?? "Taykie";
}

// The filename as bundled via app.config.ts's expo-notifications `sounds`
// array — used to set a real system notification sound (Android channel /
// iOS notification content), not just local expo-av preview playback.
// Returns null only for an explicit "Mute" choice — unset falls back to the
// default tone above, same as toneLabelForIndex.
export function toneFileName(toneIndex: number | null | undefined): string | null {
  const label = toneLabelForIndex(toneIndex);
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
