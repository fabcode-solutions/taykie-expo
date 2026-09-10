# Delivered Feature Description — Smart Pill Box

*Description of completed development capabilities*

---

## 1. Lighting Effects

- **On/off control** for the light
- **Warm white light — connection test method:** Open the app, tap the device name — the selected pill box will light up. Per the agreed pattern, it blinks 3 times, ending after 21 seconds
- **RGB light colors:**

| Color | Meaning |
|---|---|
| White | Connected |
| Red | Low battery |
| Green | Fully charged |
| Blue | Medication reminder |
| Warm Yellow | Charging |

---

## 2. Audio

- Audio on/off control
- Volume adjustment
- Tone selection — 5 types, can be monitored/previewed through the speaker

---

## 3. Battery Level Collection

- Displayed in real time when the app is open
- Sampled once every 5 minutes

---

## 4. RTC Scheduling

- "Schedule Setting" in the app is based on a 7-day week; multiple schedule entries can be **added** and **removed**
- After setup, tap **"Save Schedule"** to confirm the changes take effect
- The app supports reading back the saved schedule data from the device; the UI displays the number of schedule entries

---

## 5. Data Query

- Supports reading the Bluetooth device's clock value
- Supports syncing real-world network time (date + time) to the Bluetooth device
- Supports querying historical data (box open/close event values)

---

## 6. Change Password

- Initial default password: `000000`, or `123456` (super password)
- The super password is for backend/admin use by the app team when the customer has forgotten their password
