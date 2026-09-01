import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  memberCount: number;
  isJoined: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId?: string;
  userId?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  username?: string;
  isFriend?: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  groupType: "public" | "private";
  photo?: string;
  notifyMembers?: boolean;
  allowMembersToPost?: boolean;
}

export interface GroupsResponse {
  success: boolean;
  data: Group[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export const groupsRepo = {
  async getMyGroups(): Promise<GroupsResponse> {
    return apiClient.get<GroupsResponse>(endpoints.groups.myGroups);
  },

  async getRecommendedGroups(): Promise<GroupsResponse> {
    return apiClient.get<GroupsResponse>(endpoints.groups.recommended);
  },

  async searchGroups(query: string): Promise<GroupsResponse> {
    const params = new URLSearchParams({ q: query });
    return apiClient.get<GroupsResponse>(`${endpoints.groups.search}?${params.toString()}`);
  },

  async getGroupById(groupId: string): Promise<Group> {
    return apiClient.get<Group>(endpoints.groups.detail(groupId));
  },

  async createGroup(data: CreateGroupRequest): Promise<{ success: boolean; group: Group }> {
    return apiClient.post<{ success: boolean; group: Group }>(endpoints.groups.create, data);
  },

  async joinGroup(groupId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(endpoints.groups.join(groupId));
  },

  async leaveGroup(groupId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(endpoints.groups.leave(groupId));
  },

  async uploadGroupPhoto(file: FormData): Promise<{ url: string }> {
    return apiClient.postFormData<{ url: string }>(endpoints.groups.uploadPhoto, file);
  },
};
