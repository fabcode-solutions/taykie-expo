# Taykie Smart Pill Box
## BLE Communication Protocol & Integration Reference

*For Developers — Prepared from factory-delivered source materials*

---

## 1. Overview

The Taykie is a Smart Pill Box (智能药盒) that communicates via Bluetooth Low Energy (BLE). The device acts as a BLE Peripheral; your app acts as a Central. Once connected, your app sends structured hex command frames over a writable BLE characteristic and receives responses on a notify characteristic.

The factory has provided: a communication protocol specification (PDF), iOS source code (Objective-C/CoreBluetooth), an Android test APK, and a Windows serial-port debugger. This document translates all of that into English and gives your team everything needed to implement integration without the physical device.

---

## 2. BLE Architecture

The iOS test app (ANBlueTooth Xcode project) uses Apple's CoreBluetooth framework through a wrapper called EasyBlueTooth. The connection flow is:

- App scans for BLE peripherals (Central role)
- User selects a device by name — the Taykie will appear in the scan list
- App connects and discovers all services
- For each service, all characteristics are discovered
- A characteristic with WriteWithoutResponse property is stored as the send channel
- A characteristic with Notify property is subscribed to as the receive channel
- All commands are sent as raw hex bytes; all responses arrive as raw hex bytes on the notify callback

*Note: Data is chunked into 20-byte packets if the payload exceeds 20 bytes (standard BLE MTU for CoreBluetooth without negotiation). The iOS source splits data at 20-byte boundaries in a loop.*

### 2.1 Key BLE Parameters

| Field | Description |
|---|---|
| Role | Device = Peripheral, App = Central |
| Write characteristic | Property: WriteWithoutResponse (preferred) or Write |
| Receive characteristic | Property: Notify — enable notifications on connect |
| Max packet size | 20 bytes per write call (chunk larger payloads) |
| Data encoding | Raw bytes — all values are hexadecimal as documented below |

---

## 3. Frame Format & Checksum

Every command and response follows this general structure:

| Field | Byte(s) | Description |
|---|---|---|
| Frame Header | 1 byte | Always 0x5A |
| Command Type | 1 byte | Identifies the operation (see command list) |
| Payload | 0–N bytes | Command-specific data |
| Checksum | 1 byte | Sum of ALL preceding bytes, keep only the low 8 bits |

### 3.1 Checksum Calculation

Add all bytes from Frame Header through last payload byte, then take the result modulo 256 (i.e., keep only the lowest byte).

**Example — Time Sync command:**

```
Bytes: 5A F1 1A 06 0C 0F 1E 00
Sum:   0x5A + 0xF1 + 0x1A + 0x06 + 0x0C + 0x0F + 0x1E + 0x00 = 0x1BA
Checksum: 0x1BA & 0xFF = 0xBA
Full frame: 5A F1 1A 06 0C 0F 1E 00 BA
```

### 3.2 Time Encoding

| Field | Byte(s) | Description |
|---|---|---|
| Year | 1 byte | Offset from 2000. Range 0x00–0x63. Example: 0x1A = 2026 |
| Month | 1 byte | 0x01–0x0C. Example: 0x06 = June |
| Day | 1 byte | 0x01–0x1F. Example: 0x0C = 12th |
| Hour | 1 byte | 0x00–0x17 (24-hour). Example: 0x0F = 15:00 |
| Minute | 1 byte | 0x00–0x3B. Example: 0x1E = 30 min |
| Second | 1 byte | 0x00–0x3B. Example: 0x3B = 59 sec |

### 3.3 Weekday Bitmask

Used in schedule commands. Bits 0–6 correspond to days, where bit 0 = Sunday, bit 1 = Monday, …, bit 6 = Saturday.

- `0111 1111` (0x7F) = All 7 days active
- `0000 1111` (0x0F) = Sun/Mon/Tue/Wed active; Thu/Fri/Sat off

---

## 4. Authentication

The app must authenticate with a password on first connect before other commands will be accepted.

### 4.1 Default Passwords

- User default: `000000` → bytes: `0x00 0x00 0x00 0x00 0x00 0x00`
- Super password: `123456` → bytes: `0x01 0x02 0x03 0x04 0x05 0x06` (used when user forgets their password; back-end/admin use only)

### 4.2 Password Verification — APP → Device

**Command:** `5A E0 [p1] [p2] [p3] [p4] [p5] [p6] [checksum]`

| Field | Description |
|---|---|
| 0x5A | Frame header |
| 0xE0 | Command type: password verify |
| p1–p6 | 6 password bytes |
| checksum | Low byte of sum of all preceding bytes |

Example (default password 000000): `5A E0 00 00 00 00 00 00 E0`

### 4.3 Password Verification Reply — Device → APP

**Response:** `5A E0 [status] [checksum]`

- `0x00` = Authentication FAILED
- `0x01` = Authentication SUCCEEDED

### 4.4 Change Password — APP → Device

**Command:** `5A E1 [p1] [p2] [p3] [p4] [p5] [p6] [checksum]`

### 4.5 Change Password Reply — Device → APP

**Response:** `5A E1 [status] [checksum]` (0x00 = fail, 0x01 = success)

### 4.6 Checksum Error Reply — Device → APP

If the device receives a frame with an invalid checksum, it replies with a fixed error frame:

```
5A 00 00 5A
```

---

## 5. Time Commands

### 5.1 Sync Time — APP → Device (Command 0xF1)

**Command:** `5A F1 [year] [month] [day] [hour] [min] [sec] [checksum]`

Example: Set time to 2026-06-12 15:30:00 → `5A F1 1A 06 0C 0F 1E 00 [checksum]`

### 5.2 Sync Time Reply — Device → APP

**Response:** `5A F1 [status] [checksum]` (0x00 = fail, 0x01 = success)

### 5.3 Query Current Time — APP → Device (Command 0xF7)

**Command:** `5A F7 [checksum]`

### 5.4 Query Time Reply — Device → APP

**Response:** `5A F7 [year] [month] [day] [hour] [min] [sec] [checksum]`

---

## 6. Schedule (Medication Reminder) Commands

Schedules define when the device should alert the user to take medication. Up to 10 schedule segments per 7-day week are supported. Each segment specifies a time, which days it is active, and its audio/light settings.

### 6.1 Set Schedule — APP → Device (Command 0xF2)

**Command:** `5A F2 [enable] [weekdays] [hour] [min] [snd_en] [lgt_en] [volume] [snd_type] [reserved] [lgt_type] … (repeat x9) [checksum]`

| Field | Description |
|---|---|
| enable | 0x00 = this segment disabled, 0x01 = enabled |
| weekdays | Bitmask, bits 0–6 = Sun–Sat (see Section 3.3) |
| hour | 0x00–0x17 (24-hour format) |
| min | 0x00–0x3B |
| snd_en | 0x00 = sound off, 0x01 = sound on |
| lgt_en | 0x00 = light off, 0x01 = light on |
| volume | 0xE0–0xEF (16 volume levels) |
| snd_type | 0x00–0x05 (6 sound/tone types) |
| reserved | 0x00 (reserved, always 0) |
| lgt_type | 0x00–0x05 (6 light pattern types) |

*Note: The '…' in the frame means this 10-byte block repeats 9 more times (total 10 segments). Fill unused segments with zeros.*

### 6.2 Set Schedule Reply — Device → APP

**Response:** `5A F2 [status] [checksum]` (0x00 = fail, 0x01 = success)

### 6.3 Query Schedule — APP → Device (Command 0xF3)

**Command:** `5A F3 [checksum]`

### 6.4 Query Schedule Reply — Device → APP

**Response:** `5A F3 [battery] [snd_flag] [lgt_flag] [enable] [weekdays] [hour] [min] [snd_en] [lgt_en] [volume] [snd_type] [reserved] [lgt_type] … [checksum]`

| Field | Description |
|---|---|
| battery | 0x00–0x64 = 0–100%. 0xFF = currently charging |
| snd_flag | 0x00 = sound currently off, 0x01 = sound currently on |
| lgt_flag | 0x00 = light currently off, 0x01 = light currently on |
| enable + weekdays + … | Same 10-byte segment structure as Set Schedule, x10 segments |

Total response length: 5 + (10 × 10) + 1 = **106 bytes**.

---

## 7. Audio & Light Control

### 7.1 Audio Control — APP → Device (Command 0xF4)

**Command:** `5A F4 [on_off] [snd_type] [volume] [checksum]`

| Field | Description |
|---|---|
| on_off | 0x00 = stop sound, 0x01 = play with given parameters |
| snd_type | 0x00–0x05 — one of 6 available tones |
| volume | 0xE0–0xEF — 16 volume levels (0xE0 = min, 0xEF = max) |

*Note: When turning sound ON (0x01), you must manually send the OFF command (0x00) to stop it. It does not auto-stop.*

### 7.2 Audio Control Reply — Device → APP

**Response:** `5A F4 [status] [checksum]` (0x00 = fail, 0x01 = success)

### 7.3 Light Control — APP → Device (Command 0xF5)

**Command:** `5A F5 [on_off] [lgt_type] [reserved] [checksum]`

| Field | Description |
|---|---|
| on_off | 0x00 = turn off light, 0x01 = turn on with given parameters |
| lgt_type | 0x00–0x05 — one of 6 light pattern types |
| reserved | 0x00 (reserved byte, set to 0) |

*Note: Same as audio — turning the light ON requires a manual OFF command to stop it.*

### 7.4 Light Control Reply — Device → APP

**Response:** `5A F5 [status] [checksum]` (0x00 = fail, 0x01 = success)

### 7.5 RGB LED Status Indicator

The device has an RGB LED that automatically reflects device state (not controlled via commands):

| Color | Meaning |
|---|---|
| White | Device connected via BLE |
| Red | Low battery |
| Green | Battery fully charged |
| Blue | Medication reminder active |
| Warm Yellow | Charging in progress |

### 7.6 Warm White LED (Connection Confirmation)

When the app connects and taps the device name, the warm white LED blinks 3 times over 21 seconds as a visual confirmation.

---

## 8. History Data & Flash

### 8.1 Query History Data — APP → Device (Command 0xF6)

**Command:** `5A F6 [checksum]`

### 8.2 History Data Reply — Device → APP

**Response:** `5A F6 [year] [month] [day] [hour] [min] [reserved] [crc16_high] [crc16_low] … [checksum]`

| Field | Description |
|---|---|
| year, month, day, hour, min | 5 bytes — timestamp of the event |
| reserved | 0x00 |
| crc16_high, crc16_low | Modbus CRC-16 checksum of the record (uint16_t, big-endian) |

Each history record is 8 bytes. The device returns all stored records in sequence after receiving the query.

### 8.3 Erase Flash — APP → Device (Command 0xFF)

Clears all stored history data from flash memory.

**Command:** `5A FF [checksum]`

### 8.4 Erase Flash Reply — Device → APP

**Response:** `5A FF [status] [checksum]` (0x00 = fail, 0x01 = success)

---

## 9. Battery

Battery level is embedded in the Query Schedule reply (command 0xF3, byte index 2). There is no standalone battery query command.

- Value range: 0x00–0x64 (0%–100%)
- Special value: 0xFF means the device is currently charging
- The test app samples battery every 5 minutes when the app is open

---

## 10. Command Reference Summary

| Cmd | Direction | Name | Frame (hex) |
|---|---|---|---|
| 0xE0 | APP→Device | Password Verify | `5A E0 [×6 pw bytes] [cs]` |
| 0xE0 | Device→APP | Password Verify Reply | `5A E0 [00/01] [cs]` |
| 0xE1 | APP→Device | Change Password | `5A E1 [×6 pw bytes] [cs]` |
| 0xE1 | Device→APP | Change Password Reply | `5A E1 [00/01] [cs]` |
| 0x00 | Device→APP | Checksum Error | `5A 00 00 5A` |
| 0xF1 | APP→Device | Sync Time | `5A F1 [yr][mo][dy][hr][mn][sc] [cs]` |
| 0xF1 | Device→APP | Sync Time Reply | `5A F1 [00/01] [cs]` |
| 0xF2 | APP→Device | Set Schedule | `5A F2 [10×10 bytes] [cs]` |
| 0xF2 | Device→APP | Set Schedule Reply | `5A F2 [00/01] [cs]` |
| 0xF3 | APP→Device | Query Schedule | `5A F3 [cs]` |
| 0xF3 | Device→APP | Schedule Reply (106 bytes) | `5A F3 [batt][...×10 segments...] [cs]` |
| 0xF4 | APP→Device | Audio Control | `5A F4 [on/off][type][vol] [cs]` |
| 0xF4 | Device→APP | Audio Control Reply | `5A F4 [00/01] [cs]` |
| 0xF5 | APP→Device | Light Control | `5A F5 [on/off][type][00] [cs]` |
| 0xF5 | Device→APP | Light Control Reply | `5A F5 [00/01] [cs]` |
| 0xF6 | APP→Device | Query History | `5A F6 [cs]` |
| 0xF6 | Device→APP | History Reply (8 bytes/record) | `5A F6 [yr][mo][dy][hr][mn][00][crc_h][crc_l]... [cs]` |
| 0xF7 | APP→Device | Query Time | `5A F7 [cs]` |
| 0xF7 | Device→APP | Query Time Reply | `5A F7 [yr][mo][dy][hr][mn][sc] [cs]` |
| 0xFF | APP→Device | Erase Flash | `5A FF [cs]` |
| 0xFF | Device→APP | Erase Flash Reply | `5A FF [00/01] [cs]` |

---

## 11. Testing Without the Physical Device

Since the India team does not have the physical Taykie unit, here are the recommended approaches for developing and validating the BLE integration:

### 11.1 BLE Simulator / Mock Peripheral

Build a BLE peripheral simulator on macOS or another iOS/Android device that advertises the same services and characteristics, and responds to the protocol commands above.

- **macOS:** Use LightBlue Explorer or CoreBluetooth peripheral mode to create a mock device
- **iOS:** Run the included ANBlueTooth Xcode project against a virtual peripheral
- **Android:** nRF Connect for Mobile (Android/iOS) can simulate a peripheral and respond to writes with scripted hex responses
- **Web/Desktop:** Web Bluetooth API in Chrome can simulate peripheral behaviour for automated testing

### 11.2 Using nRF Connect as a Mock Device

nRF Connect (free, by Nordic Semiconductor) can act as both a peripheral and a central on the same phone or two phones:

- Install nRF Connect on an Android or iOS phone
- Go to Advertiser tab → create a new advertiser
- Add a service with two characteristics: one writable (for APP→Device) and one with notify (for Device→APP)
- In the GATT server tab, configure the server to auto-respond to the write characteristic with the appropriate hex reply bytes
- Use the test APK (app-debug.apk) on a second phone to scan and connect to your simulated device

### 11.3 Using the Windows Serial Debugger

The folder includes `sscom5.13.1.exe` — a serial/COM port terminal. This is only relevant if your hardware team uses a UART-to-BLE bridge board (common for firmware testing). In that setup:

- The BLE module exposes a UART interface via USB
- sscom lets you type or paste hex bytes and see responses in a terminal
- This is useful to the firmware team but not directly useful for mobile app development without the device

### 11.4 Unit Testing the Protocol Layer

Implement your BLE command builder and parser as a pure, testable module completely separate from the BLE stack. You can then write unit tests for all commands using the examples in this document, validate frame construction and checksum calculation, and test response parsing — all without a BLE connection.

**Recommended test cases:**

- Build a password verify command frame for 000000 → verify output is `5A E0 00 00 00 00 00 00 E0`
- Build a time sync command for a known date → verify all bytes and checksum
- Parse a 106-byte schedule reply → verify all 10 segments decoded correctly
- Parse a history reply with multiple records → verify CRC-16 validation per record
- Test checksum error detection → send a frame with bad checksum, expect `5A 00 00 5A` reply

---

## 12. Source Code Summary

The factory provided iOS source code in the zip archive. Here is what each key file contains:

| File | Description |
|---|---|
| `FirstViewController.m` | Scans for BLE peripherals, lists them, handles connect/disconnect callbacks |
| `ANSendMessageViewController.m` | Main BLE interaction screen: discovers services, sets up write + notify characteristics, sends/receives hex data |
| `EasyBlueToothManager.h/.m` | Wrapper around CoreBluetooth — simplifies scan, connect, service/characteristic discovery |
| `EasyCenterManager.h/.m` | CBCentralManager wrapper — manages BLE state (power on/off), scanning |
| `EasyPeripheral.h/.m` | CBPeripheral wrapper — connect, disconnect, service discovery |
| `EasyCharacteristic.h/.m` | CBCharacteristic wrapper — read, write, notify subscription |
| `EasyUtils.h/.m` | Hex string ↔ NSData conversion utilities |
| `AppDelegate.h/.m` | Stores `currentCharacteristic` (write) and `currentNotifyCharacteristic` (notify) globally |

The Android test app is provided only as an APK (`app-debug.apk`) with no source code. The mini-program (`.rar`) is a WeChat mini-program and is not relevant for native Android/iOS development.

---

## 13. Quick Start Checklist

Recommended implementation order for the India team:

- [ ] **Implement Protocol layer (pure functions):** frame builder, checksum calculator, response parser
- [ ] **Unit test protocol layer** against all examples in Section 10
- [ ] **Set up nRF Connect mock peripheral** with writable + notify characteristics
- [ ] **Implement BLE connection layer:** scan, connect, characteristic discovery, write, notify subscribe
- [ ] **Test authentication flow:** send password verify (0xE0), check 01 response
- [ ] Test time sync and query commands (0xF1, 0xF7)
- [ ] Test schedule set and query with battery read (0xF2, 0xF3)
- [ ] Test audio and light control (0xF4, 0xF5)
- [ ] Test history query and flash erase (0xF6, 0xFF)
- [ ] Integrate with UI and conduct end-to-end test with physical device when available
