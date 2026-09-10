# Communication Protocol — Smart Pill Box

**Notes:**
1. For day of week: 0 = Sunday, 1 = Monday, range [0, 6]
2. Checksum byte = sum of all preceding bytes, low 8 bits taken
3. Hour is in 24-hour format
4. All data below is in hexadecimal

---

### a. Initial Connection Password Verification: APP ---> BT

| Header | Command Type | Password | Password | Password | Password | Password | Password | Checksum |
|--------|-------------|----------|----------|----------|----------|----------|----------|----------|
| 5A | E0 | 00 | 00 | 00 | 00 | 00 | 00 | checksum |

### b. Password Verification Reply: BT ---> APP

| Header | Command Type | Verification Status | Checksum |
|--------|-------------|---------------------|----------|
| 5A | E0 | 00/01 | checksum |

### c. Change Password Command: APP ---> BT

| Header | Command Type | Password | Password | Password | Password | Password | Password | Checksum |
|--------|-------------|----------|----------|----------|----------|----------|----------|----------|
| 5A | E1 | 00 | 00 | 00 | 00 | 00 | 00 | checksum |

### d. Change Password Reply: BT ---> APP

| Header | Command Type | Setting Status | Checksum |
|--------|-------------|----------------|----------|
| 5A | E1 | 00/01 | checksum |

### e. Checksum Error Command: BT ---> APP

| Header | Command Type | Status | Checksum |
|--------|-------------|--------|----------|
| 5A | 00 | 00 | 5A |

---

### 1. Time Calibration Command: APP ---> BT

| Header | Command Type | Time | Time | Time | Time | Time | Time | Checksum |
|--------|-------------|------|------|------|------|------|------|----------|
| 5A | F1 | Year | Month | Day | Hour | Minute | Second | checksum |

### 2. Time Calibration Reply: BT ---> APP

| Header | Command Type | Setting Status | Checksum |
|--------|-------------|----------------|----------|
| 5A | F1 | 00/01 | checksum |

00 = setting failed, 01 = setting succeeded.

---

### 3. Schedule (Trip/Dosage Schedule) Setting Command: APP ---> BT

| Header | Cmd Type | Enable Bit | Weekday Enable | Start Hour | Start Minute | Sound Enable | Light Enable | Volume | Sound Type | Brightness | Light Type | … | Checksum |
|--------|----------|-----------|-----------------|-----------|---------------|--------------|--------------|--------|-----------|-----------|-----------|---|----------|
| 5A | F2 | 00/01 | bit0–bit6: valid working days Sun–Sat | Hour | Minute | 00/01 | 00/01 | E0–EF | 00–05 | reserved | 00–05 | … | checksum |

- **Enable bit:** 00 = disabled, 01 = enabled
- **Weekday enable:** e.g. `0111 1111` = active Monday through Sunday (all days); `0000 1111` = active Sunday through Wednesday, inactive Thursday/Friday/Saturday
- **Sound enable:** controls whether the sound reminder for this schedule segment is on — 00 = off, 01 = on
- **Light enable:** controls whether the light reminder for this schedule segment is on — 00 = off, 01 = on
- **Sound type:** selects the alert tone type for this schedule segment
- **Light type:** selects the alert light type for this schedule segment

**Note:** "…" represents up to nine schedule segments (omitted here); unused segments should be filled with 0.

### 4. Schedule Setting Reply: BT ---> APP

| Header | Command Type | Setting Status | Checksum |
|--------|-------------|----------------|----------|
| 5A | F2 | 00/01 | checksum |

00 = setting failed, 01 = setting succeeded.

---

### 5. Schedule Query Command: APP ---> BT

| Header | Command Type | Checksum |
|--------|-------------|----------|
| 5A | F3 | checksum |

### 6. Schedule Query Reply: BT ---> APP

| Header | Cmd Type | Battery | Sound Flag | Light Flag | Enable Bit | Weekday Enable | Start Hour | Start Minute | Sound Enable | Light Enable | Volume | Sound Type | Brightness | Light Type | … | Checksum |
|--------|----------|---------|-----------|-----------|-----------|-----------------|-----------|---------------|--------------|--------------|--------|-----------|-----------|-----------|---|----------|
| 5A | F3 | 00–64 | 00/01 | 00/01 | 00/01 | bit0–bit6: valid working days Sun–Sat | Hour | Minute | 00/01 | 00/01 | E0–EF | 00–05 | reserved | 00–05 | … | checksum |

**Note — Time parsing:**
- Weekday enable example: `0111 1111` = active Monday through Sunday (all days); `0000 1111` = active Sunday through Wednesday, inactive Thursday/Friday/Saturday
- **Year:** range (0x00–0x63); 0x1A represents the year 2026
- **Month:** range (0x01–0x0C); 0x01 = January
- **Day:** range (0x01–0x1F); 0x01 = the 1st
- **Hour:** range (0x00–0x17); 0x17 = 23:00
- **Minute:** range (0x00–0x3B); 0x3B = minute 59
- **Second:** range (0x00–0x3B); 0x3B = second 59
- **Battery:** 0x00–0x64 = 0%–100%; 0xFF = charging
- **Sound flag:** current alert-sound status — 00 = off, 01 = on
- **Light flag:** current alert-light status — 00 = off, 01 = on
- **Length:** 5 + 10×10 + 1 = 106 bytes

---

### 7. Alert Sound Control Command: APP ---> BT

| Header | Command Type | Sound Switch | Sound Type | Volume Level | Checksum |
|--------|-------------|--------------|-----------|---------------|----------|
| 5A | F4 | 00/01 | 00–05 | E0–EF | checksum |

**Sound switch:** 00 = turn off current alert sound; 01 = turn on the alert sound with the current command's parameters (must be turned off manually).

### 8. Alert Sound Control Reply: BT ---> APP

| Header | Command Type | Setting Status | Checksum |
|--------|-------------|----------------|----------|
| 5A | F4 | 00/01 | checksum |

---

### 9. Alert Light Control Command: APP ---> BT

| Header | Command Type | Light Switch | Light Type | Light Size | Checksum |
|--------|-------------|-------------|-----------|-----------|----------|
| 5A | F5 | 00/01 | 00–05 | reserved | checksum |

**Light switch:** 00 = turn off current alert light; 01 = turn on the alert light with the current command's parameters (must be turned off manually).

### 10. Alert Light Control Reply: BT ---> APP

| Header | Command Type | Setting Status | Checksum |
|--------|-------------|----------------|----------|
| 5A | F5 | 00/01 | checksum |

---

### 11. Historical Data Query Command: APP ---> BT

| Header | Command Type | Checksum |
|--------|-------------|----------|
| 5A | F6 | checksum |

### 12. Historical Data Query Reply: BT ---> APP

| Header | Cmd Type | Time | Time | Time | Time | Time | Reserve | Modbus CRC16 Verify (High uint16_t) | Modbus CRC16 Verify (Low uint16_t) | … | Checksum |
|--------|----------|------|------|------|------|------|---------|--------------------------------------|--------------------------------------|---|----------|
| 5A | F6 | Year | Month | Day | Hour | Minute | 00 | ... | ... | ... | checksum |

After receiving the query command sent by the APP, the Bluetooth module will return the historical data. Each historical data segment is 8 bytes.

---

### 13. Time Query Command: APP ---> BT

| Header | Command Type | Checksum |
|--------|-------------|----------|
| 5A | F7 | checksum |

Queries the current system time.

### 14. Time Query Reply: BT ---> APP

| Header | Command Type | Time | Time | Time | Time | Time | Time | Checksum |
|--------|-------------|------|------|------|------|------|------|----------|
| 5A | F7 | Year | Month | Day | Hour | Minute | Second | checksum |

---

### 15. FLASH Erase Command: APP ---> BT

| Header | Command Type | Checksum |
|--------|-------------|----------|
| 5A | FF | checksum |

Erases the flash storage area holding historical data.

### 16. FLASH Erase Reply: BT ---> APP

| Header | Command Type | Setting Status | Checksum |
|--------|-------------|----------------|----------|
| 5A | FF | 00/01 | checksum |

00 = erase failed, 01 = erase complete.
