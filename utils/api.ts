import { apiClient } from "@/services/api/client";

// Backwards-compatible wrapper that forwards to the new apiClient
class CompatApiClient {
  get(endpoint: string) {
    return apiClient.get(`${endpoint}`);
  }
  post(endpoint: string, data?: any) {
    return apiClient.post(`${endpoint}`, data);
  }
  put(endpoint: string, data?: any) {
    return apiClient.put(`${endpoint}`, data);
  }
  delete(endpoint: string) {
    return apiClient.delete(`${endpoint}`);
  }
}

export const api = new CompatApiClient();
