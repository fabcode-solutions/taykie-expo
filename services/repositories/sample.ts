import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";

export type SampleSummaryResponse = {
  team?: { id: string; name: string; slug?: string };
  period?: { startDate: string; endDate: string };
  summary?: {
    machineCount?: number;
    totals?: { amount?: number; count?: number };
    statuses?: Record<string, number>;
  };
  machines?: Array<{
    id: string;
    name: string;
    period?: string;
    status?: string;
  }>;
};

export const sampleRepo = {
  async summary(
    teamId: string,
    params?: { year?: number; month?: number; status?: string },
  ): Promise<SampleSummaryResponse> {
    const base = endpoints.teams.sample(teamId);
    const search = new URLSearchParams();
    if (params?.year) search.set("year", String(params.year));
    if (params?.month) search.set("month", String(params.month));
    if (params?.status) search.set("status", params.status);
    const path = search.toString() ? `${base}?${search.toString()}` : base;
    return apiClient.get<SampleSummaryResponse>(path);
  },
};
