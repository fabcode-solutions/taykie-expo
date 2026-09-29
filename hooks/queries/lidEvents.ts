import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLidEventWithDoses,
  getUnconfirmedLidEvents,
  resolveLidEvent,
  ResolveLidEventRequest,
} from "@/services/api/device";

export const lidEventKeys = {
  all: ["lidEvents"] as const,
  unconfirmed: () => [...lidEventKeys.all, "unconfirmed"] as const,
  detail: (eventId: string, localDate: string) =>
    [...lidEventKeys.all, "detail", eventId, localDate] as const,
};

export function useUnconfirmedLidEvents() {
  return useQuery({
    queryKey: lidEventKeys.unconfirmed(),
    queryFn: getUnconfirmedLidEvents,
    refetchOnMount: "always",
    // LidOpenPrompt (mounted once, globally) relies on this to notice an
    // unconfirmed event that shows up without any explicit invalidation
    // nearby — e.g. one synced while the app was briefly backgrounded. The
    // explicit invalidateQueries calls elsewhere (after a history upload, or
    // resolving an event) still make the common case instant; this is the
    // safety net for everything else.
    refetchInterval: 30_000,
  });
}

export function useLidEventWithDoses(eventId: string, localDate: string, enabled = true) {
  return useQuery({
    queryKey: lidEventKeys.detail(eventId, localDate),
    queryFn: () => getLidEventWithDoses(eventId, localDate),
    enabled: enabled && !!eventId && !!localDate,
    // Doses can change (a dose gets marked taken elsewhere) so always re-read
    staleTime: 0,
  });
}

export function useResolveLidEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, request }: { eventId: string; request: ResolveLidEventRequest }) =>
      resolveLidEvent(eventId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lidEventKeys.all });
      // A dose may have been logged: refresh the schedule screens too
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
