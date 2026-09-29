import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import { CreateSupplementEventRequest } from "@/types/supplements.types";

/**
 * Fires the mandatory usage-capture event for the supplement search brief.
 * Failures are logged by the caller, not thrown further — this is telemetry,
 * never something that should block a schedule from being saved.
 */
export function createSupplementEvent(request: CreateSupplementEventRequest): Promise<any> {
  return apiClient.post(endpoints.supplements.events, request);
}
