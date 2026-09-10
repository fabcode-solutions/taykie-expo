# Device Screen — Block Reference

Reference for every card/section on the main Device tab
([app/(tabs)/device.tsx](../app/(tabs)/device.tsx)). Each block below covers
what it is, where its data comes from, and what interacting with it actually
does on the BLE/backend side.

---

## 1. Connection & Hardware Status

**Always visible**, regardless of connection state.

What it shows:
- **Connection** — "Online"/"Offline", from `connectionStatus` in `bleStore`.
- **Battery** — percentage (0–100%), or "Charging" when the device reports
  the special `0xFF` value instead of a percentage. Comes from the F3 Query
  Status reply, refreshed by a background poll every 15s while connected.
- **Last Sync** — when the app last successfully talked to the device
  (`lastSyncedAt`), shown as "Today, 2:32 PM" or a full date otherwise.

Other elements in this block:
- An ⓘ **info icon** next to the "Connection" title opens a legend
  explaining the device's own RGB LED colors (White = connected, Red = low
  battery, Green = fully charged, Blue = medication reminder, Warm Yellow =
  charging). This is purely informational — the LED is hardware-autonomous
  and not controlled by the app at all.
- A **Disconnect** button (only while connected) that intentionally drops
  the BLE link.

---

## 2. Audio Settings

**Only visible while connected.** Lets the user preview and set the sound
the device plays for reminders.

- **Volume slider (0–100%)** — a custom drag slider (`RangeSlider`). Dragging
  it plays a live preview on the device's own speaker via the F4 Sound
  Control command. Internally the 0–100% UI value maps to the protocol's
  real `0xE0`–`0xEF` byte range. Debounced (250ms) so a fast drag only sends
  the value the user actually settles on, not every intermediate step.
- **Tone picker** — a horizontal row of the 6 tones the protocol supports
  (Mute + 5 real tones). Tapping one previews it on the device the same way,
  debounced identically.
- A small spinner/checkmark/error icon appears next to whichever
  tone/volume was just tapped, reflecting whether the device actually
  acknowledged that specific command (not just that the app sent it).

---

## 3. On-Device Reminders ("Active Schedules")

**Only visible while connected.** These are the device's own onboard
schedule slots (F2/F3), which fire autonomously from the device's internal
clock — independent of the app's own dosage-schedule notifications, and
they keep working even if the phone is off or out of Bluetooth range.

- Shows up to 10 schedule slots as read back from the device (F3 Query
  Schedule), each with its time (e.g. "01:00PM") and active days ("Every
  day", "Weekdays", or specific days).
- Each row has a switch to enable/disable that exact slot in place — this
  re-sends the entire 10-slot table to the device (F2 has no per-slot update,
  only a full rewrite) and then reads it back to confirm the change actually
  landed before trusting it succeeded.
- **"Manage"** opens a separate screen ([app/device/schedule-sync.tsx](../app/device/schedule-sync.tsx))
  where the user picks which of their existing app dosage schedules
  (daily/weekly only — monthly schedules have no device-side equivalent)
  should be pushed onto these 10 slots, up to the device's hard cap.

---

## 4. Compartments

**Only visible while connected.** A visual grid (days across, dose-times
down) showing which physical pill compartments are "in use" by the active
schedule.

- Row count = the user's dose-frequency setting from onboarding (1–3
  doses/day, editable under Settings › Dosage & Compartments).
- Each cell lights up if that schedule slot is active on that day of the
  week. Today's column/row is highlighted separately.
- If more enabled schedule slots exist than the configured dose-frequency
  allows, a note tells the user how many extra times didn't fit the grid.
- This is a derived visualization only — the protocol has no actual
  "compartment ID" concept; it's inferred purely from the same schedule
  slots as the block above.

---

## 5. Compartment Activity

**Only visible while connected.** Shows recent lid-open events read from the
device's history log (F6 Query History).

- "Last accessed" plus a short list of the 5 most recent events, each
  formatted as a date/time (e.g. "Sep 3, 2:32 PM").
- A refresh button re-queries the device directly for a quick on-screen
  check (does **not** open a backend sync session — see "Sync History"
  below for that).
- An **"Erase (Test)"** button is present for QA/debugging only — it
  permanently wipes the device's stored history (F6/FF) so the next query
  reply is short enough to sanity-check the raw byte layout. Not meant for
  end users; gated behind a confirmation prompt.
- Note: the protocol's history record is just a timestamp — there is no
  open/closed flag, so these are described as "accessed" events rather than
  a specific open/close state.

---

## 6. Quick Actions

**Always visible.** A list of one-off device operations:

| Action | What it does |
|---|---|
| **Dismiss Active Alert** | Sends explicit "off" commands for both sound (F4) and light (F5) — stops a currently-sounding/blinking reminder immediately. |
| **Sync History** | Reads the device's full history (F6), opens a backend sync session sized to the real record count, uploads it in batches, marks the session complete, then erases the device's flash (F6 is a plain read — only FF actually clears it, so this is the one place that happens automatically). |
| **Find My Taykie** | Blinks the device's light 3 times over ~21 seconds (F5) so the user can physically locate the box, and opens the pairing screen at the same time. |
| **Rename Device** | Opens a screen to change the device's display name in the app/backend. This is app-side only — the device has no way to store a custom name over Bluetooth. |
| **Change Device Password** | Opens a screen to change the device's own 6-digit BLE pairing PIN (E0/E1) — separate from the user's account password. |

---

## Notes

- Every card except "Connection & Hardware Status" and "Quick Actions" is
  hidden entirely while disconnected, since none of their data is
  meaningful (or fetchable) without a live BLE link.
- A commented-out "Available Devices" scan list still exists in the source
  but is currently disabled/unused in favor of the dedicated
  [pair-device](../app/device/pair-device.tsx) screen.
