import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export interface PairDeviceRequest {
  name: string;
  blePeripheralId: string;
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

export async function pairDevice(request: PairDeviceRequest) {
  return apiClient.post(endpoints.device.pair_device, request);
}

export async function unpairDevice(deviceId: string): Promise<any> {
  return apiClient.delete(`${endpoints.device.device}/${deviceId}`);
}

export async function startHistorySyncApi(deviceId: string): Promise<any> {
  return apiClient.post(`${endpoints.device.device}/${deviceId}/${endpoints.device.sync_history}`);
}

export async function uploadHistoryBatch(updateRequest: UpdateHistoryBatchRequest): Promise<any> {
  return apiClient.post(
    `${endpoints.device.device}/${updateRequest.deviceId}/${endpoints.device.sync_history}/${updateRequest.sessionId}/records`,
    { records: updateRequest.records },
  );
}

export async function completeSyncSession(request: CompleteSyncSessionRequest): Promise<any> {
  return apiClient.post(
    `${endpoints.device.device}/${request.deviceId}/${endpoints.device.sync_history}/${request.sessionId}/records`,
    { status: request.status ? "completed" : "failed" },
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
