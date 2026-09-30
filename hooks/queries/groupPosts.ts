import { useQuery } from "@tanstack/react-query";
import { getGroupPosts } from "./posts";
import { CommunityPost } from "@/types/posts.types";

export const groupPostKeys = {
  all: ["groupPosts"] as const,
  list: (groupId: string) => [...groupPostKeys.all, groupId] as const,
};

const GROUP_POSTS_LIMIT = 20;

/** Latest posts made in a group (newest first). */
export function useGroupPosts(groupId: string) {
  return useQuery({
    queryKey: groupPostKeys.list(groupId),
    queryFn: async (): Promise<CommunityPost[]> => {
      const response = await getGroupPosts(groupId, 1, GROUP_POSTS_LIMIT);
      const data = (response as { data?: unknown })?.data;
      return Array.isArray(data) ? (data as CommunityPost[]).filter((p) => p?.id) : [];
    },
    enabled: !!groupId,
  });
}
