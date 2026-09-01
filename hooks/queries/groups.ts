import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import { CreateGroupRequest } from "@/types/groups.types";

export async function createGroup(request: CreateGroupRequest): Promise<any> {
  return apiClient.post(endpoints.group.group, request);
}

export async function getAllGroups(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.group.group}?page=${page}&limit=${limit}`);
}

export async function getUserGroups(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.group.myGroups}?page=${page}&limit=${limit}`);
}

export async function deleteGroup(groupId: string): Promise<any> {
  return apiClient.delete(`${endpoints.group.myGroups}/${groupId}`);
}

export async function updateGroup(
  groupId: string,
  updateRequest: CreateGroupRequest,
): Promise<any> {
  return apiClient.put(`${endpoints.group.myGroups}/${groupId}`, updateRequest);
}

export async function getGroupById(groupId: string): Promise<any> {
  return apiClient.get(`${endpoints.group.group}/${groupId}`);
}

export async function joinGroupById(groupId: string): Promise<any> {
  return apiClient.post(`${endpoints.group.group}/${groupId}/join`);
}
export async function leaveGroupById(groupId: string): Promise<any> {
  return apiClient.post(`${endpoints.group.group}/${groupId}/leave`);
}

export async function getGroupMembers(
  groupId: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(`${endpoints.group.group}/${groupId}?page=${page}&limit=${limit}`);
}

export async function getRecommendedGroups(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.group.recommended_groups}?page=${page}&limit=${limit}`);
}

export async function getFriends(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.users.friends}?page=${page}&limit=${limit}`);
}
