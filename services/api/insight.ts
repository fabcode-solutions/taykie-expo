import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export enum InsightPeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

export async function getUserInsights(period: InsightPeriod): Promise<any> {
  return apiClient.get(`${endpoints.users.insights}?view=${period}`);
}

export async function getDataToExport(): Promise<any> {
  return apiClient.get(endpoints.users.export);
}

export async function getUserInsightsInRange(from: string, to: string): Promise<any> {
  return apiClient.get(`${endpoints.users.insights}?from=${from}&to=${to}`);
}
export async function getUserInsightsByDate(date: string): Promise<any> {
  return apiClient.get(`${endpoints.users.insights}?date=${date}`);
}
