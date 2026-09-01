import { NotificationSettingsModel, NotificationType } from "@/stores/notificationStore";
import { apiClient } from "./client";
import { endpoints } from "./endpoints";
import { Platform } from "react-native";

export interface NotificationRequest {
  fromUserId: string;
  toUserId: string;
  type: NotificationType;
  heading: string;
  context: string;
}

export async function getUserNotifications(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.notification.notifications}?page=${page}&limit=${limit}`);
}

export async function deleteUserNotification(notificationId: string): Promise<any> {
  return apiClient.delete(`${endpoints.notification.notifications}/${notificationId}`);
}

export async function markNotificationAsRead(notificationId: string): Promise<any> {
  return apiClient.patch(`${endpoints.notification.notifications}/${notificationId}/read`);
}

export async function marAllNotificationAsRead(): Promise<any> {
  return apiClient.patch(endpoints.notification.read_all);
}

export async function updateNotificationSettings(request: NotificationSettingsModel): Promise<any> {
  return apiClient.put(endpoints.users.settings, request);
}

export async function getNotificationSettings(): Promise<any> {
  return apiClient.get(endpoints.users.settings);
}

export async function registerFcmToken(fcmToken: string): Promise<any> {
  return apiClient.post(endpoints.users.fcmToken, { fcmToken, platform: Platform.OS });
}

export async function createNotification(request: NotificationRequest): Promise<any> {
  return apiClient.post(endpoints.notification.send, request);
}
