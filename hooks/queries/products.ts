import { useQuery } from "@tanstack/react-query";
import { productsRepo } from "@/services/repositories/products";
import { CreateLogRequest, MedicationListResponse, ProductRequest } from "@/types/products.types";
import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";

const keys = {
  summary: (query: string, page?: number, limit?: number) =>
    ["summary", query, String(page ?? ""), String(limit ?? "")] as const,
};

export function useProducts(query?: string, params?: { page?: number; limit?: number }) {
  return useQuery<MedicationListResponse>({
    queryKey: query ? keys.summary(query, params?.page, params?.limit) : [""],
    queryFn: () => productsRepo.search({ params: params ?? {}, query: query as string }),
    enabled: !!query,
  });
}

export async function getUserProducts(page: number = 1, limit: number = 15): Promise<any> {
  return apiClient.get(`${endpoints.products.products}?page=${page}&limit=${limit}`);
}

export async function getPublicProducts(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.products.public_product}?page=${page}&limit=${limit}`);
}

export async function getProductById(productId: string): Promise<any> {
  return apiClient.get(`${endpoints.products.products}/${productId}`);
}

export function createProduct(requestBody: ProductRequest): Promise<any> {
  return apiClient.post(endpoints.products.products, requestBody);
}

export function deleteProduct(productId: string): Promise<any> {
  return apiClient.delete(`${endpoints.products.products}/${productId}`);
}

export function updateProduct(productId: string, request: ProductRequest): Promise<any> {
  return apiClient.put(`${endpoints.products.products}/${productId}`, request);
}

export async function createLog(scheduleId: string, request: CreateLogRequest): Promise<any> {
  return apiClient.post(`${endpoints.schedule.schedules}/${scheduleId}/logs`, request);
}

export async function deleteLog(logId: string): Promise<any> {
  return apiClient.delete(`${endpoints.schedule.schedules}/logs/${logId}`);
}

export async function getUserLogs(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.schedule.schedules}/logs?page=${page}&limit=${limit}`);
}
