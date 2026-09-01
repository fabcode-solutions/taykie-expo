import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_BASE_URL } from "@/utils/config";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuthStore } from "@/stores/authStore";
import { OnboardRequest } from "@/stores/onboardingStore";

type ProviderType = "google" | "apple";
export type LoginResponse = {
  token: string;
  requiresTotp?: boolean;
  // Some servers might include session payloads on login; keep flexible
  authenticated?: boolean;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
};

export interface ReportRequest {
  reason: string;
  type: string;
}

export interface SocialLoginRequest {
  provider: ProviderType;
  accessToken: string;
  providerUserId?: string;
}
export type SessionResponse = {
  authenticated: boolean;
  requiresTotp?: boolean;
  session?: { uid: string; role: string; type: string };
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: string;
  };
};

function safeBtoa(input: string): string {
  if (typeof globalThis.btoa === "function") return btoa(input);
  // Minimal Base64 encoder for ASCII strings (email/password are ASCII)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input;
  let output = "";
  for (
    let block = 0, charCode: number, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) throw new Error("Invalid character in btoa polyfill");
    block = (block << 8) | charCode;
  }
  return output;
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(
    endpoints.auth.login,
    { email, password },
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function loginWithBasic(email: string, password: string): Promise<LoginResponse> {
  const basic = `Basic ${safeBtoa(`${email}:${password}`)}`;
  return apiClient.post<LoginResponse>(endpoints.auth.login, undefined, {
    headers: {
      Authorization: basic,
      Accept: "application/json",
    },
  });
}

export async function getSession(): Promise<SessionResponse> {
  return apiClient.get<SessionResponse>(endpoints.auth.session, {
    headers: { Accept: "application/json" },
  });
}

export async function requestPasswordRecovery(
  email: string,
): Promise<{ success: boolean; message?: string }> {
  return apiClient.post(
    endpoints.auth.requestRecovery,
    { email },
    {
      headers: { Accept: "application/json" },
    },
  );
}

export async function submitPasswordRecovery(args: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ success: boolean; requiresTotp?: boolean; message?: string }> {
  return apiClient.post(endpoints.auth.submitRecovery, args, {
    headers: { Accept: "application/json" },
  });
}

// --- NextAuth-backed public auth APIs (as per provided docs) ---

export type RegisterRequest = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string; // ISO date string
  location?: string;
  gender?: string;
  birthYear?: string;
  country?: string;
  accepted_terms: boolean;
};

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  gender?: string;
  country?: string;
  location?: string;
  birthYear?: string;
  phoneNumber?: string;
  timezone?: string;
  locale?: string;
}

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type RegisterResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    dob: string;
  };
};

export async function registerUser(body: RegisterRequest): Promise<any> {
  return apiClient.post<RegisterResponse>(endpoints.authPublic.register, body);
}

export async function changePassword(body: ChangePasswordRequest): Promise<any> {
  return apiClient.post(endpoints.authPublic.changePassword, body);
}

export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(
    endpoints.authPublic.forgotPassword,
    { email },
    { headers: { Accept: "application/json" } },
  );
}

export async function verifyOtpApi(args: {
  email: string;
  otp: string; // length 5
}): Promise<{ message: string; data: { verified: boolean } }> {
  return apiClient.post(endpoints.authPublic.verifyOtp, args, {
    headers: { Accept: "application/json" },
  });
}

export async function resetPasswordApi(
  args: { token: string; password: string } | { email: string; otp: string; password: string },
): Promise<{ message: string }> {
  return apiClient.post(endpoints.authPublic.resetPassword, args, {
    headers: { Accept: "application/json" },
  });
}

// NextAuth cookie-based session helpers
export async function getNextAuthCsrf(): Promise<{ csrfToken: string }> {
  return apiClient.get(endpoints.authNext.csrf, { headers: { Accept: "application/json" } });
}

export async function signInWithNextAuthCredentials(
  email: string,
  password: string,
): Promise<void> {
  const { csrfToken } = await getNextAuthCsrf();
  await apiClient.postFormUrlEncoded(endpoints.authNext.callbackCredentials, {
    csrfToken,
    email,
    password,
    callbackUrl: "/",
  });
}

export async function getNextAuthSession(): Promise<any> {
  return apiClient.get(endpoints.authNext.session, { headers: { Accept: "application/json" } });
}

export async function logoutUser(): Promise<any> {
  return apiClient.post(endpoints.auth.logout);
}

export async function signOutNextAuth(): Promise<void> {
  try {
    const { csrfToken } = await getNextAuthCsrf();
    await apiClient.postFormUrlEncoded(endpoints.authNext.signout, {
      csrfToken,
      callbackUrl: "/",
    });
  } catch {
    // ignore signout failure
  }
}

export async function fetchUserProfileDetails(): Promise<any> {
  return apiClient.get(endpoints.users.profile);
}

export async function deleteUserAccount(): Promise<any> {
  return apiClient.delete(endpoints.users.account);
}

export async function restoreUserAccount(): Promise<any> {
  return apiClient.post(`${endpoints.users.account}/restore`);
}

// Start OAuth with NextAuth in a browser tab and return when redirected
export async function startNextAuthOAuth(provider: "google" | "apple"): Promise<void> {
  const redirectUri = Linking.createURL("/");
  const authUrl = `${API_BASE_URL}${endpoints.authNext.session.replace("/session", "")}/signin/${provider}?callbackUrl=${encodeURIComponent(
    redirectUri,
  )}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== "success") {
    throw new Error("Authentication canceled");
  }
  // Try cookie bridge if backend includes an exchange token in the redirect URL
  await tryBridgeFromRedirect(result.url).catch(() => false);
  // After browser returns, try to fetch profile/session to confirm auth
  try {
    await fetchUserProfile();
  } catch {
    await getNextAuthSession();
  }
}

// Attempt to bridge cookie session using an exchange token in the redirect URL
export async function tryBridgeFromRedirect(url?: string): Promise<boolean> {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const exchangeToken =
      parsed.searchParams.get("exchangeToken") ||
      parsed.searchParams.get("mobileToken") ||
      parsed.searchParams.get("sessionToken") ||
      parsed.searchParams.get("token");
    const provider = parsed.searchParams.get("provider") as "google" | "apple" | undefined;
    if (!exchangeToken) return false;
    await exchangeMobileOAuth({ provider: provider ?? "bridge", exchangeToken });
    return true;
  } catch {
    return false;
  }
}

// Mobile OAuth exchange API
export async function exchangeMobileOAuth(payload: {
  provider: "google" | "apple" | "bridge" | string;
  authorizationCode?: string;
  idToken?: string;
  accessToken?: string;
  identityToken?: string;
  exchangeToken?: string;
  redirectUri?: string;
  codeVerifier?: string;
}): Promise<{ message?: string; user?: any }> {
  return apiClient.post(endpoints.authMobile.exchange, payload, {
    headers: { Accept: "application/json" },
  });
}

// Google native sign-in using Authorization Code + PKCE, then exchange server-side to set cookie
export async function startGoogleNativeAndExchange(): Promise<void> {
  const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID as string;
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID");
  }

  GoogleSignin.configure({
    iosClientId: GOOGLE_CLIENT_ID,
    scopes: ["profile", "email"],
  });

  await GoogleSignin.hasPlayServices();

  const userInfo = await GoogleSignin.signIn();

  const tokens = await GoogleSignin.getTokens();

  const request: SocialLoginRequest = {
    provider: "google",
    providerUserId: userInfo.data?.user?.id,
    accessToken: tokens.accessToken,
  };
  try {
    await useAuthStore.getState().saveSocialLoggedinData(request);
  } catch (error) {
    throw error;
  }
}

// Apple native sign-in and exchange
export async function startAppleNativeAndExchange(): Promise<void> {
  const Apple = await import("expo-apple-authentication");
  const available = await (Apple as any).isAvailableAsync();
  if (!available) throw new Error("Apple Sign-In not available on this device");
  const cr = await (Apple as any).signInAsync({
    requestedScopes: [
      (Apple as any).AppleAuthenticationScope.FULL_NAME,
      (Apple as any).AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!cr.identityToken && !cr.authorizationCode) throw new Error("No Apple credentials returned");

  const request: SocialLoginRequest = {
    provider: "apple",
    accessToken: cr.identityToken,
    providerUserId: cr.user,
  };
  try {
    await useAuthStore.getState().saveSocialLoggedinData(request);
  } catch (error) {
    throw error;
  }
}

export async function socialLogin(request: SocialLoginRequest): Promise<any> {
  return apiClient.post(endpoints.auth.social, request);
}

export async function refreshTokenApi(token: string): Promise<any> {
  return apiClient.post(endpoints.auth.refresh, { refreshToken: token });
}

export async function updateUserprofile(request: ProfileUpdateRequest): Promise<void> {
  return apiClient.put(endpoints.users.profile, request);
}

export async function getUserFollowersList(
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(`/users/${userId}/followers?page=${page}&limit=${limit}`);
}

export async function getUserFollowingList(
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(`/users/${userId}/following?page=${page}&limit=${limit}`);
}

export async function followUser(userId: string): Promise<any> {
  return apiClient.post(`/users/${userId}/follow`);
}

export async function unFollowUser(userId: string): Promise<any> {
  return apiClient.delete(`/users/${userId}/follow`);
}

export async function saveOnboarding(request: OnboardRequest): Promise<any> {
  return apiClient.post(endpoints.onboarding.save, request);
}

export async function completeOnboarding(): Promise<any> {
  return apiClient.post(endpoints.onboarding.complete);
}

export async function getOnboardingStatus(): Promise<any> {
  return apiClient.get(endpoints.onboarding.status);
}

export async function resetOnboarding(): Promise<any> {
  return apiClient.post(endpoints.onboarding.reset);
}

export async function reportUser(userId: string, request: ReportRequest): Promise<any> {
  return apiClient.post(`/users/${userId}/report`, request);
}

export async function getSuggestionList(page: number = 1, limit: number = 10): Promise<any> {
  return apiClient.get(`${endpoints.users.suggestions}?page=${page}&limit=${limit}`);
}

export async function getPublicProfile(userId: string): Promise<any> {
  return apiClient.get(`/users/${userId}`);
}
