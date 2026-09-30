import { persist } from "zustand/middleware";

import { create } from "zustand";
import { mmkvJSONStateStorage } from "./stateStorage";
import { CreateGroupRequest, GroupResponse } from "@/types/groups.types";
import {
  createGroup,
  deleteGroup,
  getAllGroups,
  getFriends,
  getGroupById,
  getGroupMembers,
  getRecommendedGroups,
  getUserGroups,
  joinGroupById,
  leaveGroupById,
  updateGroup,
} from "@/hooks/queries/groups";
import { getErrorMessage } from "./postStore";
import { GroupMember } from "@/services/repositories/groups";
import { useUploadStore } from "./uploadStore";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

type State = {
  userGroups: GroupResponse[];
  groups: GroupResponse[];
  recommendedGroups: GroupResponse[];
  groupMembers: GroupMember[];
  group: GroupResponse | null;
  isLoading: boolean;
  error: string | null;
  groupFriends: any[];
};

type Actions = {
  createGroup: (requestBody: CreateGroupRequest) => Promise<string>;
  fetchUserGroups: () => Promise<void>;
  fetchAllGroups: () => Promise<void>;
  /** silent: refetch in place — keep the current group on screen, no isLoading. */
  fetchGroupById: (groupId: string, silent?: boolean) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, updateRequest: CreateGroupRequest) => Promise<void>;
  joinGroup: (groupId: string) => Promise<string>;
  leaveGroup: (groupId: string) => Promise<string>;
  fetchGroupMembers: (groupId: string) => Promise<void>;
  fetchRecommendedGroups: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  clearError: () => void;
};

const initialState: State = {
  userGroups: [],
  groups: [],
  group: null,
  isLoading: false,
  error: null,
  groupMembers: [],
  recommendedGroups: [],
  groupFriends: [],
};

// API base URL now handled by the shared api client + endpoints

export const useGroupStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      createGroup: async (requestBody) => {
        set({ isLoading: true, error: null });
        let imageUrl = null;

        try {
          if (requestBody.uploadGroupPhoto) {
            const url = await useUploadStore.getState().uploadImage(requestBody.uploadGroupPhoto);
            imageUrl = url;
          }
          const response = await createGroup({
            ...requestBody,
            ...(imageUrl && { uploadGroupPhoto: imageUrl }),
          });

          await get().fetchUserGroups();
          set({ isLoading: false, groupFriends: [] });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.createGroup));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      fetchUserGroups: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await getUserGroups();
          set({ isLoading: false, userGroups: result?.data });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchUserGroups));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },

      fetchGroupById: async (groupId, silent = false) => {
        if (!silent) set({ isLoading: true, error: null, group: null });
        try {
          const result = await getGroupById(groupId);
          set(silent ? { group: result.data } : { isLoading: false, group: result.data });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchTodayGroups));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },

      fetchAllGroups: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await getAllGroups();
          set({ isLoading: false, groups: result.data });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchAllGroups));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },

      deleteGroup: async (groupId) => {
        set({ isLoading: true, error: null });
        try {
          await deleteGroup(groupId);
          await get().fetchUserGroups();
          set({ isLoading: false });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.deleteGroup));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },

      updateGroup: async (groupId, request) => {
        set({ isLoading: true, error: null });
        try {
          await updateGroup(groupId, request);
          await get().fetchUserGroups();
          set({ isLoading: false });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.updateGroup));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      leaveGroup: async (groupId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await leaveGroupById(groupId);
          // Flip the open group's membership right away (button label + member count),
          // then refetch it SILENTLY — a normal fetchGroupById clears `group`, which
          // flashed the whole group screen back to its skeleton.
          set((state) => ({
            group:
              state.group?.id === groupId
                ? {
                    ...state.group,
                    isMember: false,
                    membersCount: Math.max(0, (state.group.membersCount ?? 0) - 1),
                  }
                : state.group,
          }));
          await get().fetchUserGroups();
          await get().fetchAllGroups();
          await get().fetchGroupById(groupId, true);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.leaveGroup));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      joinGroup: async (groupId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await joinGroupById(groupId);
          // Flip the open group's membership right away (button label + member count),
          // then refetch it SILENTLY — a normal fetchGroupById clears `group`, which
          // flashed the whole group screen back to its skeleton.
          set((state) => ({
            group:
              state.group?.id === groupId
                ? {
                    ...state.group,
                    isMember: true,
                    membersCount: Math.max(0, (state.group.membersCount ?? 0) + 1),
                  }
                : state.group,
          }));
          await get().fetchUserGroups();
          await get().fetchAllGroups();
          await get().fetchGroupById(groupId, true);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.joinGroup));

          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      fetchGroupMembers: async (groupId) => {
        set({ isLoading: true, error: null, groupMembers: [] });
        try {
          const response = await getGroupMembers(groupId);
          set({ isLoading: false, groupMembers: response.data });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchGroupMembers));
          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      fetchRecommendedGroups: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getRecommendedGroups();
          set({ isLoading: false, recommendedGroups: response.data });
        } catch (error) {
          const message = getErrorMessage(
            error,
            t(LocalizedStrings.errors.api.fetchRecommendedGroups),
          );
          set({
            isLoading: false,
            error: message,
          });

          throw new Error(message);
        }
      },
      fetchFriends: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getFriends();
          set({ isLoading: false, groupFriends: response.data });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.fetchGroupFriends));
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
      name: "group-store",
      storage: mmkvJSONStateStorage,
      partialize: (state) => ({
        group: state.group,
        userGroups: state.userGroups,
      }),
    },
  ),
);
