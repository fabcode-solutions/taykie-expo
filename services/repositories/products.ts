import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import { MedicationListResponse } from "@/types/products.types";

export const productsRepo = {
  async search({
    query,
    params,
  }: {
    query: string;
    params: { page?: number; limit?: number };
  }): Promise<MedicationListResponse> {
    const param = new URLSearchParams({
      q: query,
      ...(params?.page ? { page: params?.page.toString() } : {}),
      ...(params?.limit ? { limit: params?.limit.toString() } : {}),
    });

    const data = await apiClient.get<MedicationListResponse>(
      `${endpoints.products.search}?${param.toString()}`,
    );
    return data;
  },
};
