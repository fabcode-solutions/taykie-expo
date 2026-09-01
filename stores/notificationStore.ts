import { persist } from "zustand/middleware";

import { create } from "zustand";
import { mmkvJSONStateStorage } from "./stateStorage";
import { getErrorMessage } from "./postStore";
import {
  createNotification,
  deleteUserNotification,
  getNotificationSettings,
  getUserNotifications,
  marAllNotificationAsRead,
  markNotificationAsRead,
  NotificationRequest,
  registerFcmToken,
  updateNotificationSettings,
} from "@/services/api/notification";
import { User } from "./authStore";

// models/NotificationUpdateRequestModel.ts
export type NotificationType = "Follow" | "Like" | "Comment" | "System" | "Group";
export interface NotificationSettings {
  id?: string;
  userId?: string;
  appNotification?: boolean;
  vibration?: boolean;
  showOnLockScreen?: boolean;
  notificationSound?: string;
}

export interface ReminderSettings {
  id?: string;
  userId?: string;
  snoozeDuration?: string;
  earlyReminderAlert?: boolean;
  missedDoseNotifications?: boolean;
  reminderSound?: boolean;
  reminderLight?: boolean;
}

export interface IntegrationsSettings {
  id?: string;
  userId?: string;
  appleHealth?: boolean;
  googleFit?: boolean;
}

export interface NotificationSettingsModel {
  notifications?: NotificationSettings;
  reminders?: ReminderSettings;
  integrations?: IntegrationsSettings;
}

export interface NotificationData {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  action: string;
  resourceId: null;
  isRead: false;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  fromUser: User;
}

type State = {
  fcmToken: string | null;
  notifications: NotificationData[];
  notificationSettings: NotificationSettingsModel | null;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  page: number;
  hasMore: boolean;
  isFetchingNextPage: boolean;
};

type Actions = {
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotificationSettings: () => Promise<void>;
  updateNotificationSettings: (request: NotificationSettingsModel) => Promise<string>;
  registerFCMToken: (token: string) => Promise<void>;
  sendNotification: (request: NotificationRequest) => Promise<string>;
  clearError: () => void;
};

const initialState: State = {
  fcmToken: null,
  notifications: [],
  notificationSettings: null,
  isLoading: false,
  error: null,
  unreadCount: 0,
  page: 1,
  hasMore: true,
  isFetchingNextPage: false,
};

export const isNotificationSoundEnabled = (type: string) => {
  const settings = useNotificationStore.getState().notificationSettings;

  // Check based on the notification type
  if (type === "dosage_reminder") {
    // Return true if reminderSound is set to "default"
    return settings?.reminders?.reminderSound;
  }

  // Fallback for all other types (Like, Comment, Follow, etc.)
  return settings?.notifications?.notificationSound === "default";
};

export const showNotificationOnLockScreen = () => {
  const settings = useNotificationStore.getState().notificationSettings;
  return settings?.notifications?.showOnLockScreen ?? false;
};

// API base URL now handled by the shared api client + endpoints

export const useNotificationStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      fetchNotifications: async (reset = false) => {
        const { page, isLoading, isFetchingNextPage, hasMore } = get();

        // 1. IMPROVED GUARD:
        // If we're already fetching, stop.
        // If it's not a reset and we have no more items, stop.
        if (isLoading || isFetchingNextPage || (!reset && !hasMore)) return;

        const targetPage = reset ? 1 : page;

        // 2. STATE UPDATE:
        // When reset is true, clear the list immediately (optional but avoids dupes)
        // When reset is false, set isFetchingNextPage to TRUE (crucial)
        if (reset) {
          set({ isLoading: true, error: null });
        } else {
          set({ isFetchingNextPage: true, error: null });
        }

        try {
          const result = await getUserNotifications(targetPage);
          const newNotifications = result.data || [];

          // 3. DUPLICATE PROTECTION:
          // We filter out any IDs that already exist in our state just in case
          // the API returns a shifted result due to new data.
          set((state) => {
            const existingIds = new Set(state.notifications.map((n) => n.id));
            const uniqueNewNotifications = newNotifications.filter(
              (n: NotificationData) => !existingIds.has(n.id),
            );

            return {
              notifications: reset
                ? newNotifications
                : [...state.notifications, ...uniqueNewNotifications],
              page: targetPage + 1,
              // Check if we've reached the end
              hasMore: targetPage < (result.meta?.totalPages ?? 1),
              unreadCount: result.meta?.unreadCount ?? 0,
              isLoading: false,
              isFetchingNextPage: false,
            };
          });
        } catch (error) {
          const message = getErrorMessage(error, "Fetch User Notifications failed");
          set({ isLoading: false, isFetchingNextPage: false, error: message });
        }
      },
      markAsRead: async (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true as any, readAt: new Date().toISOString() }
              : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));

        try {
          await markNotificationAsRead(notificationId);
        } catch (error) {
          // Revert on failure
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, isRead: false as any, readAt: null } : n,
            ),
            unreadCount: state.unreadCount + 1,
          }));
          const message = getErrorMessage(error, "Mark notification as Read failed");
          set({ error: message });
          throw new Error(message);
        }
      },
      deleteNotification: async (notificationId) => {
        const deleted = get().notifications.find((n) => n.id === notificationId);
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
          unreadCount:
            deleted && !deleted.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        }));

        try {
          await deleteUserNotification(notificationId);
          await get().fetchNotifications(true);
        } catch (error) {
          // Revert on failure
          if (deleted) {
            set((state) => ({
              notifications: [deleted, ...state.notifications],
            }));
          }
          const message = getErrorMessage(error, "Delete User notification failed");
          set({ error: message });
          throw new Error(message);
        }
      },
      markAllAsRead: async () => {
        const previousNotifications = get().notifications;
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true as any,
            readAt: new Date().toISOString(),
          })),
          unreadCount: 0,
        }));

        try {
          await marAllNotificationAsRead();
        } catch (error) {
          // Revert on failure
          set({ notifications: previousNotifications });
          const message = getErrorMessage(error, "Mark All notification as Read failed");
          set({ error: message });
          throw new Error(message);
        }
      },

      updateNotificationSettings: async (request) => {
        set({ isLoading: true, error: null });
        try {
          const response = await updateNotificationSettings(request);
          await get().fetchNotificationSettings();
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, "Update Notification Settings failed");
          set({
            isLoading: false,
            error: message,
          });
          throw new Error(message);
        }
      },
      fetchNotificationSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getNotificationSettings();
          set({ isLoading: false, notificationSettings: response.data });
        } catch (error) {
          const message = getErrorMessage(error, "Fetch Notification Settings failed");
          set({
            isLoading: false,
            error: message,
          });
          throw new Error(message);
        }
      },
      registerFCMToken: async (token) => {
        set({ isLoading: true, error: null });
        try {
          const response = await registerFcmToken(token);
          set({ isLoading: false, fcmToken: response.data });
        } catch (error) {
          const message = getErrorMessage(error, "Fetch FCM Token failed");
          set({
            isLoading: false,
            error: message,
          });
          throw new Error(message);
        }
      },
      sendNotification: async (request) => {
        set({ isLoading: true, error: null });
        try {
          const response = await createNotification(request);
          await get().fetchNotifications(true);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, "Send Notification failed");
          set({
            isLoading: false,
            error: message,
          });
          throw new Error(message);
        }
      },
      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: "notification-store",
      storage: mmkvJSONStateStorage,
    },
  ),
);
