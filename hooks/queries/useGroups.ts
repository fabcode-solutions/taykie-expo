import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsRepo } from "@/services/repositories/groups";
import type { CreateGroupRequest } from "@/services/repositories/groups";
import { useDebounce } from "@/utils/hooks";
import { endpoints } from "@/services/api/endpoints";
import { apiClient } from "@/services/api/client";

const QUERY_KEYS = {
  myGroups: ["groups", "my"] as const,
  recommended: ["groups", "recommended"] as const,
  search: (query: string) => ["groups", "search", query] as const,
  detail: (id: string) => ["groups", "detail", id] as const,
};

export function useMyGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.myGroups,
    queryFn: groupsRepo.getMyGroups,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecommendedGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.recommended,
    queryFn: groupsRepo.getRecommendedGroups,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useGroupsSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: QUERY_KEYS.search(debouncedQuery),
    queryFn: () => groupsRepo.searchGroups(debouncedQuery),
    enabled: debouncedQuery.length > 2, // Only search with 3+ characters
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest) => groupsRepo.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => groupsRepo.joinGroup(groupId),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myGroups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(groupId) });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["users", "search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { users: [] };

      const params = new URLSearchParams({ q: query });
      return apiClient.get<{ users: User[] }>(`${endpoints.users.search}?${params.toString()}`);
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadGroupPhoto() {
  return useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "group-photo.jpg",
      } as any);

      return groupsRepo.uploadGroupPhoto(formData);
    },
  });
}
