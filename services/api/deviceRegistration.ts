import { apiClient } from "./client";
import { endpoints } from "./endpoints";

/** A Taykie registered for warranty (backend /api/v1/device/registration). */
export interface DeviceRegistration {
  serialNumber: string;
  /** ISO timestamp */
  registeredAt: string;
  /** ISO timestamp — one year after registeredAt */
  warrantyEndsAt: string;
}

/** The account's current registration, or null when it has none. */
export async function getMyRegistration(): Promise<DeviceRegistration | null> {
  const response = await apiClient.get<{ data: DeviceRegistration | null }>(
    endpoints.device.registration,
  );
  return response?.data ?? null;
}

/**
 * Register a serial number. Failure statuses (thrown by apiClient as `{ status, message }`):
 *   404 / 422 → not a valid serial number
 *   403       → registration limit reached for this serial
 */
export async function registerDevice(serialNumber: string): Promise<DeviceRegistration> {
  const response = await apiClient.post<{ data: DeviceRegistration }>(
    endpoints.device.registration,
    { serialNumber },
  );
  return response.data;
}
