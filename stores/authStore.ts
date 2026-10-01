import { persist } from "zustand/middleware";
import { sendExtensionAuthToken } from "@/utils/extension";
import {
  mmkvJSONStateStorage,
  setTokenInNative,
  create,
  resetAllStores,
  clearAllStorage,
  deleteTokenFromNative,
} from "./stateStorage";
import { setAuthToken } from "@/services/api/token";
import { setOnUnauthorized } from "@/services/api/events";
import { router } from "expo-router";
import { Asset } from "expo-asset";
import {
  registerUser,
  forgotPasswordApi,
  verifyOtpApi,
  resetPasswordApi,
  deleteUserAccount,
  loginWithEmailPassword,
  fetchUserProfileDetails,
  ChangePasswordRequest,
  changePassword,
  logoutUser,
  SocialLoginRequest,
  socialLogin,
  restoreUserAccount,
  ProfileUpdateRequest,
  updateUserprofile,
  getUserFollowersList,
  getUserFollowingList,
  followUser,
  unFollowUser,
  ReportRequest,
  reportUser,
  getSuggestionList,
  getPublicProfile,
} from "@/services/api/auth";
import { getErrorMessage, usePostStore } from "./postStore";
import { getDeviceTimezone } from "@/utils/timezone";
import { getTimezoneToSync } from "@/utils/timezoneSync";
import { useUploadStore } from "./uploadStore";
import { Images } from "@/assets";
import { useOnboardingStore } from "./onboardingStore";
import { useNotificationStore } from "./notificationStore";
import { UserStreakData } from "@/types/schedule.types";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
export interface SocialLogeinData {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  user: User;
}

export interface PublicProfile {
  user: User;
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
  isFollowing: boolean;
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  emailVerified?: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio?: string | null;
  birthYear?: number | null;
  gender?: string | null;
  country?: string | null;
  phoneNumber?: string | null;
  locale?: string;
  location?: string;
  timezone?: string;
  preferences?: Record<string, any>;
  notificationUid?: string | null;
  loginCount?: number;
  lastLogin?: string;
  deletedAt?: string | null;
}
// type User = AuthUser & { name?: string };

type State = {
  token: string | null;
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
  refreshToken: string | null;
  user: User | null;
  publicProfile: PublicProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  resetEmail?: string | null;
  resetToken?: string | null;
  following: (User & { isFriend: boolean })[];
  followers: (User & { isFriend: boolean })[];
  suggestionList: any[];
  userStreak: UserStreakData | null;
  // Cache of preset avatar key (e.g. "cover_3") -> already-uploaded S3 URL for
  // this user, so re-selecting the same preset doesn't re-upload the bundled
  // asset on every save.
  presetAvatarUploads: Record<string, string>;
};

type Actions = {
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (credentials: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    dob?: string; // ISO date string
  }) => Promise<string>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<string>;
  restoreAccount: () => Promise<string>;
  clearError: () => void;
  setToken: (token: string, user: User) => void;
  reset: () => void;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<string>;
  verifyResetCode: (args: { email: string; code: string }) => Promise<void>;
  resetPassword: (
    args: { token: string; password: string } | { email: string; otp: string; password: string },
  ) => Promise<string>;
  fetchUserProfile: () => Promise<void>;
  saveSocialLoggedinData: (data: SocialLoginRequest) => Promise<void>;
  updateProfile: (
    request: ProfileUpdateRequest,
    onStageChange?: (stage: "uploading" | "saving") => void,
  ) => Promise<string>;
  fetchFollowersList: () => Promise<void>;
  fetchFollowingList: () => Promise<void>;
  followUserId: (userId: string) => Promise<string>;
  unFollowUserId: (userId: string) => Promise<string>;
  submitUserReport: (request: ReportRequest) => Promise<string>;
  fetchSuggestionList: () => Promise<void>;
  fetchPublicProfile: (userId: string) => Promise<void>;
  /** Saves the phone's time zone to the profile whenever it differs (the zone isn't editable). */
  syncDeviceTimezone: () => Promise<void>;
};

const initialState: State = {
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  resetEmail: null,
  resetToken: null,
  stats: { postsCount: 0, followersCount: 0, followingCount: 0 },
  following: [],
  followers: [],
  suggestionList: [],
  userStreak: null,
  publicProfile: null,
  presetAvatarUploads: {},
};

// API base URL now handled by the shared api client + endpoints

// Private cleanup function for logout and delete account
const performCompleteCleanup = async () => {
  // 1. Reset in-memory state FIRST
  resetAllStores();

  // 2. Clear the physical storage SECOND
  clearAllStorage();

  // 3. Clear tokens
  setAuthToken(null);
  deleteTokenFromNative();
};

export const useAuthStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        if (!credentials.email || !credentials.password) {
          set({ isLoading: false, error: t(LocalizedStrings.errors.api.credentialsRequired) });
          return;
        }
        try {
          const result = await loginWithEmailPassword(credentials.email, credentials.password);
          setAuthToken(result.data.accessToken);
          set({
            token: result.data.accessToken,
            refreshToken: result.data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          await get().fetchUserProfile();
          await useOnboardingStore.getState().fetchOnboardingStatus();
        } catch (error) {
          const message = getErrorMessage(error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : t(LocalizedStrings.errors.api.login),
          });
          throw Error(message);
        }
      },

      register: async (_credentials) => {
        set({ isLoading: true, error: null });
        try {
          const result = await registerUser(_credentials);

          set({
            isLoading: false,
            token: result.data.accessToken,
            refreshToken: result.data.refreshToken,
            isAuthenticated: true,
          });
          await get().fetchUserProfile();
          return result.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.registration));

          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.registration),
          });
          throw Error(message);
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await forgotPasswordApi(email);
          set({ isLoading: false, resetEmail: email });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },

      changePassword: async (request) => {
        set({ isLoading: true, error: null });
        try {
          const response = await changePassword(request);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },

      fetchUserProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetchUserProfileDetails();
          const settings = res.data.settings || {};
          useNotificationStore.setState((state) => ({
            ...state,
            notificationSettings: settings,
          }));

          set({
            user: res.data,
            stats: res.data.stats,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            userStreak: res.data.streak,
          });

          // Keep the saved time zone in step with the phone (unset/"UTC" accounts, and
          // travellers whose phone zone changed) — see utils/timezoneSync.ts.
          void get().syncDeviceTimezone();
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },

      verifyResetCode: async ({ email, code }) => {
        set({ isLoading: true, error: null });

        try {
          const res = await verifyOtpApi({ email, otp: code });

          if (!res?.data?.verified) {
            throw new Error(res?.message || t(LocalizedStrings.errors.api.invalidOtp));
          }

          set({
            isLoading: false,
            resetEmail: email,
            resetToken: code,
          });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.verification),
          });
          throw Error(message);
        }
      },

      resetPassword: async (args) => {
        set({ isLoading: true, error: null });
        let message = "";
        try {
          // Supports both token and email+otp flows
          if ("token" in args) {
            const response = await resetPasswordApi({ token: args.token, password: args.password });
            message = response.message;
          } else {
            const response = await resetPasswordApi({
              email: args.email,
              otp: args.otp,
              password: args.password,
            });
            message = response.message;
          }
          set({ isLoading: false, resetToken: null });
          return message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : t(LocalizedStrings.errors.api.reset),
          });
          throw Error(message);
        }
      },
      saveSocialLoggedinData: async (request) => {
        set({ isLoading: true, error: null });
        try {
          const result = await socialLogin(request);
          set({
            token: result.data.accessToken,
            refreshToken: result.data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          await get().fetchUserProfile();
          await useOnboardingStore.getState().fetchOnboardingStatus();
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await logoutUser();
          await performCompleteCleanup();
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },
      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await deleteUserAccount();
          set({
            isLoading: false,
          });
          await get().fetchUserProfile();
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },
      restoreAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await restoreUserAccount();
          set({
            isLoading: false,
          });
          await get().fetchUserProfile();
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },
      // onStageChange lets a caller (edit-profile.tsx) show "Uploading
      // image…" vs "Saving…" instead of one generic spinner for the whole
      // call — this is the one place that actually knows which of the two
      // is happening, since both run inside a single await chain here.
      updateProfile: async (request, onStageChange) => {
        set({ isLoading: true, error: null });
        try {
          let imageUrl = null;

          if (request.avatarUrl) {
            const rawAvatarUrl = request.avatarUrl;
            const isPresetKey =
              !rawAvatarUrl.startsWith("file") && !rawAvatarUrl.startsWith("http");
            const cachedPresetUrl = isPresetKey
              ? get().presetAvatarUploads[rawAvatarUrl]
              : undefined;

            if (cachedPresetUrl) {
              // Already uploaded this preset for this user — reuse the URL
              // instead of re-uploading the same bundled asset again.
              imageUrl = cachedPresetUrl;
            } else {
              onStageChange?.("uploading");
              let fileUri = rawAvatarUrl;

              // If it's a cover image key, get real URI
              if (isPresetKey) {
                fileUri = Asset.fromModule(Images.cover[fileUri as keyof typeof Images.cover]).uri;
              }

              imageUrl = await useUploadStore.getState().uploadImage(fileUri);

              if (isPresetKey && imageUrl) {
                set((state) => ({
                  presetAvatarUploads: { ...state.presetAvatarUploads, [rawAvatarUrl]: imageUrl! },
                }));
              }
            }
          }
          onStageChange?.("saving");
          const response = await updateUserprofile({
            ...request,
            ...(imageUrl && { avatarUrl: imageUrl }),
          });

          set({
            isLoading: false,
          });
          await useOnboardingStore.getState().fetchOnboardingStatus();
          await get().fetchUserProfile();

          // Patch already-loaded posts/comments so the user's own avatar
          // updates on the Community feed immediately, without waiting for
          // the next full refetch.
          const currentUser = get().user;
          if (imageUrl && currentUser?.id) {
            usePostStore.getState().patchUserAvatarInFeed(currentUser.id, imageUrl);
          }

          return response.message;
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },
      fetchFollowersList: async () => {
        const userId = get().user?.id;
        if (!userId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await getUserFollowersList(userId);
          const currentStats = get().stats;
          set({
            followers: response.data,
            stats: { ...currentStats, followersCount: response.data.length },
            isLoading: false,
          });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      fetchFollowingList: async () => {
        const userId = get().user?.id;
        if (!userId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await getUserFollowingList(userId);
          const currentStats = get().stats;
          set({
            following: response.data,
            stats: { ...currentStats, followingCount: response.data.length },
            isLoading: false,
          });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },
      followUserId: async (userId) => {
        if (!userId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await followUser(userId);
          await Promise.all([
            get().fetchFollowersList(),
            get().fetchFollowingList(),
            get().fetchSuggestionList(),
            get().fetchUserProfile(),
          ]);
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },
      unFollowUserId: async (userId) => {
        if (!userId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await unFollowUser(userId);
          await get().fetchFollowersList();
          await get().fetchFollowingList();
          await get().fetchSuggestionList();
          await get().fetchUserProfile();
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      submitUserReport: async (request) => {
        set({ isLoading: true, error: null });
        const userId = get().user?.id;
        try {
          const response = await reportUser(userId, request);
          set({ isLoading: false });
          return response.message;
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },
      fetchSuggestionList: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await getSuggestionList();
          set({ isLoading: false, suggestionList: response.data });
        } catch (error) {
          const message = getErrorMessage(error);
          set({ isLoading: false, error: message });
          throw Error(message);
        }
      },

      syncDeviceTimezone: async () => {
        const user = get().user;
        if (!user || !get().isAuthenticated) return;
        const zone = getTimezoneToSync(user.timezone, getDeviceTimezone());
        if (!zone) return;
        try {
          await updateUserprofile({ timezone: zone });
          const current = get().user;
          if (current) set({ user: { ...current, timezone: zone } });
        } catch (syncError) {
          // Retried on the next launch / foreground.
          console.warn("Timezone sync failed:", syncError);
        }
      },
      fetchPublicProfile: async (userId: string) => {
        set({ isLoading: true, error: null, publicProfile: null });
        try {
          const res = await getPublicProfile(userId);

          set({
            publicProfile: res.data,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = getErrorMessage(error, t(LocalizedStrings.errors.api.requestFailed));
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : t(LocalizedStrings.errors.api.requestFailed),
          });
          throw Error(message);
        }
      },

      clearError: () => set({ error: null }),

      setToken: (token, user) => {
        setTokenInNative(token);
        setAuthToken(token);
        sendExtensionAuthToken(token);
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: "auth-store",
      storage: mmkvJSONStateStorage,
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        presetAvatarUploads: state.presetAvatarUploads,
      }),
      onRehydrateStorage: () => async (state) => {
        try {
          const token = state?.token ?? null;
          setAuthToken(token);
          if (token) {
            // Ensure native side also has the token on cold start
            setTokenInNative(token);
          }
          await useNotificationStore.getState().fetchNotifications();
        } catch {}
      },
    },
  ),
);

// Register a global unauthorized handler used by the API client
setOnUnauthorized(async () => {
  try {
    await useAuthStore.getState().logout();
    router.replace("/(auth)/auth-start");
  } catch (error) {
    // Alert.alert("Error", error.mesage);
  }
});
