import { useQuery } from "@tanstack/react-query";
import { sampleRepo, SampleSummaryResponse } from "@/services/repositories/sample";

const keys = {
  summary: (teamId: string, year?: number, month?: number, status?: string) =>
    ["summary", teamId, String(year ?? ""), String(month ?? ""), status ?? ""] as const,
};

export function useSampleSummary(
  teamId?: string,
  params?: { year?: number; month?: number; status?: string },
) {
  return useQuery<SampleSummaryResponse>({
    queryKey: teamId
      ? keys.summary(teamId, params?.year, params?.month, params?.status)
      : ["summary"],
    queryFn: () => sampleRepo.summary(teamId as string, params),
    enabled: !!teamId,
  });
}
