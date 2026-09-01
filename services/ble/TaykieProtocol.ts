import { Buffer } from "buffer";

export const TAYKIE_UUIDS = {
  SERVICE: "0000ffe0-0000-1000-8000-00805f9b34fb",
  NOTIFY: "0000ffe1-0000-1000-8000-00805f9b34fb",
  WRITE: "0000ffe2-0000-1000-8000-00805f9b34fb",
};

export enum FuncCode {
  QueryStatus = 0x00,
  DismissAlert = 0x01,
  SetTone = 0x02,
  SetVolume = 0x03, // Working assumption per Spec 7.4 [cite: 12, 62, 63]
  SetSchedule = 0x05,
  ReadHistory = 0x06,
  SetTime = 0x07,
  HistoryAck = 0xff,
}

export class TaykieProtocol {
  static buildFrame(funcCode: number, data: number[] = [], isQuery: boolean = false): string {
    const startCode = 0x55; // Fixed start code [cite: 18]
    const cmdCode = 0x10; // App -> Device [cite: 18]
    const dataType = isQuery ? 0x00 : 0x05;
    const dataLen = data.length;

    const frameHeader = [startCode, cmdCode, funcCode, dataType, dataLen];
    const fullBody = [...frameHeader.slice(1), ...data];

    // Low byte of byte-sum from Cmd Code through last Data Area byte [cite: 20, 21]
    const checksum = fullBody.reduce((acc, byte) => acc + byte, 0) & 0xff;

    return Buffer.from([...frameHeader, ...data, checksum]).toString("base64");
  }

  static parseFrame(base64: string) {
    const buffer = Buffer.from(base64, "base64");
    const bytes = Array.from(buffer);

    if (bytes[0] !== 0x55 || bytes[1] !== 0x11) {
      throw new Error("Invalid Start or Cmd Code");
    }

    const funcCode = bytes[2];
    const dataType = bytes[3];
    const dataLen = bytes[4];
    const dataArea = bytes.slice(5, 5 + dataLen);
    const checksum = bytes[bytes.length - 1];

    const sumBytes = bytes.slice(1, bytes.length - 1);
    const calculatedSum = sumBytes.reduce((a, b) => a + b, 0) & 0xff;

    return { funcCode, dataType, dataLen, dataArea, isValid: checksum === calculatedSum };
  }

  static encodeCurrentTime(): number[] {
    const now = new Date();
    // Assuming base year 2000 per factory spec notes [cite: 12, 28, 111]
    const yearOffset = Math.max(0, now.getFullYear() - 2000);

    // Note: No day-of-month byte as per pending clarification
    return [
      yearOffset,
      now.getMonth() + 1, // 0x01-0x0C [cite: 28, 111]
      now.getHours(), // 0x00-0x17 [cite: 28, 111]
      now.getMinutes(), // 0x00-0x3B [cite: 28, 111]
      now.getSeconds(), // 0x00-0x3B [cite: 28, 111]
    ];
  }

  static parseStatus(data: number[]) {
    if (data.length < 24) return null; // Must be 24 bytes [cite: 37]

    const schedules = [];
    for (let i = 0; i < 5; i++) {
      const offset = i * 4;
      schedules.push({
        enabled: data[offset] === 0x01,
        daysBitmask: data[offset + 1],
        hour: data[offset + 2],
        minute: data[offset + 3],
      });
    }

    return {
      schedules,
      batteryLevel: data[20], // 0x00-0x64 or 0xFF [cite: 38]
      lidState: data[21] === 0x01 ? "open" : "closed", // 0x00 closed, 0x01 open [cite: 38]
      toneIndex: data[22],
      volumeLevel: data[23],
    };
  }

  // Parses the 8-byte history records
  static parseHistoryBatch(dataArea: number[]) {
    const records = [];
    for (let i = 0; i < dataArea.length; i += 8) {
      if (i + 8 > dataArea.length) break;

      const seqNo = (dataArea[i] << 8) | dataArea[i + 1]; // 2 bytes big-endian [cite: 91]
      const year = 2000 + dataArea[i + 2]; // Base 2000 + offset [cite: 91]

      records.push({
        sequenceNumber: seqNo,
        timestamp: new Date(
          year,
          dataArea[i + 3] - 1, // JS Months are 0-indexed, device is 1-12 [cite: 91]
          dataArea[i + 4], // Day 1-31 [cite: 91]
          dataArea[i + 5], // Hour 0-23 [cite: 91]
          dataArea[i + 6], // Min 0-59 [cite: 91]
          dataArea[i + 7], // Sec 0-59 [cite: 91]
        ).toISOString(),
      });
    }
    return records;
  }
}
