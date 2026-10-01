import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyRegistration, registerDevice } from "@/services/api/deviceRegistration";

export const deviceRegistrationKeys = {
  me: ["deviceRegistration", "me"] as const,
};

/** The account's current registration (null when not registered). */
export function useMyRegistration() {
  return useQuery({
    queryKey: deviceRegistrationKeys.me,
    queryFn: getMyRegistration,
    staleTime: 60 * 1000,
  });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerDevice,
    onSuccess: (registration) => {
      queryClient.setQueryData(deviceRegistrationKeys.me, registration);
    },
  });
}
