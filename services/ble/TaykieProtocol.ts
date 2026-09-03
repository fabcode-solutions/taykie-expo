import { Buffer } from "buffer";

// Per 通信协议_药盒(1).pdf: service 0xFFF0, notify (device -> app) 0xFFF1,
// write (app -> device) 0xFFF2.
export const TAYKIE_UUIDS = {
  SERVICE: "0000fff0-0000-1000-8000-00805f9b34fb",
  NOTIFY: "0000fff1-0000-1000-8000-00805f9b34fb",
  WRITE: "0000fff2-0000-1000-8000-00805f9b34fb",
};

const FRAME_HEADER = 0x5a;

// Command byte (the frame's 2nd byte). 0x00 is not a real command — the
// device sends it back as an unsolicited reply when a frame it received
// failed its checksum.
export enum CmdType {
  ChecksumError = 0x00,
  PasswordVerify = 0xe0,
  ChangePassword = 0xe1,
  TimeCalibration = 0xf1,
  SetSchedule = 0xf2,
  QueryStatus = 0xf3,
  SoundControl = 0xf4,
  LightControl = 0xf5,
  QueryHistory = 0xf6,
  QueryTime = 0xf7,
  EraseFlash = 0xff, // Destructive: wipes stored history on the device.
}

export const SCHEDULE_SLOT_COUNT = 10;
const SCHEDULE_SLOT_SIZE = 10;

export interface ScheduleSlot {
  enabled: boolean;
  weekdayBitmask: number; // bit0 = Sunday .. bit6 = Saturday
  hour: number;
  minute: number;
  soundEnabled: boolean;
  lightEnabled: boolean;
  volume: number; // 0xE0-0xEF
  soundType: number; // 0x00-0x05
  lightType: number; // 0x00-0x05
}

export const EMPTY_SCHEDULE_SLOT: ScheduleSlot = {
  enabled: false,
  weekdayBitmask: 0,
  hour: 0,
  minute: 0,
  soundEnabled: false,
  lightEnabled: false,
  volume: 0xe0,
  soundType: 0,
  lightType: 0,
};

export interface DeviceStatus {
  batteryLevel: number; // 0x00-0x64, or 0xFF while charging
  soundOn: boolean;
  lightOn: boolean;
  schedules: ScheduleSlot[];
}

export interface HistoryRecord {
  timestamp: string;
  // The spec labels this byte "reserved" with no defined meaning. Kept here
  // so it can be inspected for a possible undocumented open/closed flag.
  reserved: number;
  crc16: number;
}

export interface DeviceTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export class TaykieProtocol {
  // Every frame is [0x5A][cmdType][...data][checksum], where checksum is the
  // low 8 bits of the sum of every preceding byte (header included).
  static buildFrame(cmdType: number, data: number[] = []): string {
    const body = [FRAME_HEADER, cmdType, ...data];
    const checksum = body.reduce((sum, byte) => sum + byte, 0) & 0xff;
    return Buffer.from([...body, checksum]).toString("base64");
  }

  static parseFrame(base64: string) {
    const bytes = Array.from(Buffer.from(base64, "base64"));

    if (bytes.length < 3 || bytes[0] !== FRAME_HEADER) {
      const headerHex = (bytes[0] ?? 0).toString(16).padStart(2, "0");
      throw new Error(`Invalid frame header: 0x${headerHex}`);
    }

    const cmdType = bytes[1];
    const checksum = bytes[bytes.length - 1];
    const body = bytes.slice(0, bytes.length - 1);
    const calculatedChecksum = body.reduce((sum, byte) => sum + byte, 0) & 0xff;
    const data = bytes.slice(2, bytes.length - 1);

    return { cmdType, data, isValid: checksum === calculatedChecksum };
  }

  // The 6-digit password is sent as six bytes, one per digit. The spec's
  // examples only ever show the default "000000", so this assumes each
  // digit is sent as its raw numeric value rather than ASCII.
  static encodePassword(password: string): number[] {
    return password
      .padStart(6, "0")
      .slice(-6)
      .split("")
      .map((digit) => Number(digit) & 0x0f);
  }

  // F1 payload: year offset from 2000, month, day, hour, minute, second.
  static encodeCurrentTime(): number[] {
    const now = new Date();
    const yearOffset = Math.min(0x63, Math.max(0, now.getFullYear() - 2000));

    return [
      yearOffset,
      now.getMonth() + 1, // 0x01-0x0C
      now.getDate(), // 0x01-0x1F
      now.getHours(), // 0x00-0x17
      now.getMinutes(), // 0x00-0x3B
      now.getSeconds(), // 0x00-0x3B
    ];
  }

  static parseTime(data: number[]): DeviceTime | null {
    if (data.length < 6) return null;
    return {
      year: 2000 + data[0],
      month: data[1],
      day: data[2],
      hour: data[3],
      minute: data[4],
      second: data[5],
    };
  }

  static parseScheduleSlot(bytes: number[]): ScheduleSlot {
    return {
      enabled: bytes[0] === 0x01,
      weekdayBitmask: bytes[1],
      hour: bytes[2],
      minute: bytes[3],
      soundEnabled: bytes[4] === 0x01,
      lightEnabled: bytes[5] === 0x01,
      volume: bytes[6],
      soundType: bytes[7],
      // bytes[8] is reserved
      lightType: bytes[9],
    };
  }

  static buildScheduleSlot(slot: ScheduleSlot): number[] {
    return [
      slot.enabled ? 0x01 : 0x00,
      slot.weekdayBitmask,
      slot.hour,
      slot.minute,
      slot.soundEnabled ? 0x01 : 0x00,
      slot.lightEnabled ? 0x01 : 0x00,
      slot.volume,
      slot.soundType,
      0x00, // reserved
      slot.lightType,
    ];
  }

  // Builds the F2 "set schedule" payload from up to 10 slots, padding any
  // remaining slots as disabled/empty.
  static buildSchedulePayload(slots: ScheduleSlot[]): number[] {
    const padded = [...slots, ...Array(SCHEDULE_SLOT_COUNT).fill(EMPTY_SCHEDULE_SLOT)].slice(
      0,
      SCHEDULE_SLOT_COUNT,
    );
    return padded.flatMap((slot) => this.buildScheduleSlot(slot));
  }

  // Parses the F3 "query status" reply: battery + current sound/light flags
  // + all 10 schedule slots (106-byte frame total).
  static parseStatus(data: number[]): DeviceStatus | null {
    const requiredLength = 3 + SCHEDULE_SLOT_COUNT * SCHEDULE_SLOT_SIZE;
    if (data.length < requiredLength) return null;

    const batteryLevel = data[0];
    const soundOn = data[1] === 0x01;
    const lightOn = data[2] === 0x01;

    const schedules: ScheduleSlot[] = [];
    for (let i = 0; i < SCHEDULE_SLOT_COUNT; i++) {
      const offset = 3 + i * SCHEDULE_SLOT_SIZE;
      schedules.push(this.parseScheduleSlot(data.slice(offset, offset + SCHEDULE_SLOT_SIZE)));
    }

    return { batteryLevel, soundOn, lightOn, schedules };
  }

  // Parses the F6 history reply: repeating 8-byte records, each
  // [year, month, day, hour, minute, reserved, crc16High, crc16Low].
  // Note: this spec has no per-record sequence number and no batch-ack
  // command — see BLEService for why ack/pagination is currently disabled.
  static parseHistoryRecords(data: number[]): HistoryRecord[] {
    const records: HistoryRecord[] = [];
    for (let i = 0; i + 8 <= data.length; i += 8) {
      const year = 2000 + data[i];
      const month = data[i + 1];
      const day = data[i + 2];
      const hour = data[i + 3];
      const minute = data[i + 4];
      // Undocumented as anything but "reserved" — surfaced on the record so
      // it can be inspected empirically for a possible open/closed flag.
      const reserved = data[i + 5];
      const crc16 = (data[i + 6] << 8) | data[i + 7];

      records.push({
        timestamp: new Date(year, month - 1, day, hour, minute).toISOString(),
        reserved,
        crc16,
      });
    }
    return records;
  }
}
