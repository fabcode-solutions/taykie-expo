import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getTipById, getTips } from "@/services/api/tips";
import { useOnboardingStore } from "@/stores/onboardingStore";

export const tipKeys = {
  all: ["tips"] as const,
  list: (limit: number) => [...tipKeys.all, "list", limit] as const,
  infinite: (pageSize: number) => [...tipKeys.all, "infinite", pageSize] as const,
  detail: (tipId: string) => [...tipKeys.all, "detail", tipId] as const,
};

/**
 * Latest published tips. Skipped entirely when the user explicitly opted out on the
 * onboarding Coaching & Tips screen; the backend enforces the same opt-in
 * (returns an empty list), so a stale local value can't leak tips either way.
 */
export function useTips(limit: number = 10) {
  const coachingEnabled = useOnboardingStore((s) => s.coaching_enabled);
  return useQuery({
    queryKey: tipKeys.list(limit),
    queryFn: () => getTips(1, limit),
    enabled: coachingEnabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/** All published tips, paginated — the "See all" tips screen. Same opt-in gate as useTips. */
export function useInfiniteTips(pageSize: number = 10) {
  const coachingEnabled = useOnboardingStore((s) => s.coaching_enabled);
  return useInfiniteQuery({
    queryKey: tipKeys.infinite(pageSize),
    queryFn: ({ pageParam }) => getTips(pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.tips.length, 0);
      return lastPage.tips.length > 0 && loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: coachingEnabled !== false,
  });
}

export function useTip(tipId: string) {
  return useQuery({
    queryKey: tipKeys.detail(tipId),
    queryFn: () => getTipById(tipId),
    enabled: !!tipId,
  });
}
