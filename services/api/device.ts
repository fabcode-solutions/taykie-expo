import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export interface PairDeviceRequest {
  name: string;
  blePeripheralId: string;
}

// The backend's own device record — `id` here is a UUID and is what every
// other per-device endpoint (ble-state, history sync, unpair, ...) actually
// expects as `deviceId`. `blePeripheralId` is only the raw BLE address
// (a MAC on Android) used to look the record up / create it — the two are
// NOT interchangeable, even though both loosely mean "this device".
export interface PairedDevice {
  id: string;
  name: string;
  userId: string;
  blePeripheralId: string;
  alertToneIndex: number | null;
  alertVolume: number | null;
  bleSchedules: BLESchedule[];
  batteryLevel: number | null;
  lidState: boolean;
  firmwareVersion: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PairDeviceResponse {
  success: boolean;
  message: string;
  data: PairedDevice;
  timestamp: string;
}

export interface UpdateBLEStateRequest {
  batteryLevel?: number;
  lidState?: boolean;
  alertToneIndex?: number;
  alertVolume?: number;
  firmwareVersion?: string;
  bleSchedules?: BLESchedule[];
}

export interface BLESchedule {
  enabled: boolean;
  daysBitmask: number;
  hour: number;
  minute: number;
  soundEnabled: boolean;
  lightEnabled: boolean;
  volume: number;
  soundType: number;
  lightType: number;
}

export interface HistoryBatch {
  sequenceNumber: number;
  eventAt: string;
}

export interface UpdateHistoryBatchRequest {
  deviceId: string;
  sessionId: string;
  records: HistoryBatch[];
}

export interface CompleteSyncSessionRequest {
  deviceId: string;
  sessionId: string;
  status: string;
}

export async function getDevices(): Promise<any> {
  return apiClient.get(endpoints.device.device);
}

export async function updateBLEState(
  deviceId: string,
  requestBody: UpdateBLEStateRequest,
): Promise<any> {
  return apiClient.patch(`${endpoints.device.device}/${deviceId}/ble-state`, requestBody);
}

export async function pairDevice(request: PairDeviceRequest): Promise<PairDeviceResponse> {
  return apiClient.post(endpoints.device.pair_device, request);
}

export async function unpairDevice(deviceId: string): Promise<any> {
  return apiClient.delete(`${endpoints.device.device}/${deviceId}`);
}

// Backend caps each batch at 20 records (spec) — chunk here so callers never
// have to remember the limit themselves.
const HISTORY_BATCH_SIZE = 20;

export async function startHistorySyncApi(deviceId: string, totalRecords: number): Promise<any> {
  return apiClient.post(`${endpoints.device.device}/${deviceId}/${endpoints.device.sync_history}/start`, {
    totalRecords,
  });
}

export async function uploadHistoryBatch(updateRequest: UpdateHistoryBatchRequest): Promise<any> {
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < updateRequest.records.length; i += HISTORY_BATCH_SIZE) {
    const chunk = updateRequest.records.slice(i, i + HISTORY_BATCH_SIZE);
    const result: any = await apiClient.post(
      `${endpoints.device.device}/${updateRequest.deviceId}/${endpoints.device.sync_history}/${updateRequest.sessionId}/records`,
      { records: chunk },
    );
    inserted += result?.data?.inserted ?? result?.inserted ?? 0;
    skipped += result?.data?.skipped ?? result?.skipped ?? 0;
  }
  return { inserted, skipped };
}

export async function completeSyncSession(request: CompleteSyncSessionRequest): Promise<any> {
  return apiClient.patch(
    `${endpoints.device.device}/${request.deviceId}/${endpoints.device.sync_history}/${request.sessionId}/complete`,
    { status: request.status },
  );
}

export async function getDeviceHistory(
  deviceId: string,
  page: number = 1,
  limit: number = -10,
): Promise<any> {
  return apiClient.get(
    `${endpoints.device.device}/${deviceId}/history?page=${page}&limit=${limit}`,
  );
}
