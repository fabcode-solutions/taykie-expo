import { API_BASE_URL, REQUEST_TIMEOUT_MS, DEFAULT_RETRY_COUNT } from "@/utils/config";
import { triggerUnauthorized } from "@/services/api/events";
import { useAuthStore } from "@/stores/authStore";
import { refreshTokenApi } from "./auth";

export type ApiError = {
  status: number;
  code?: string;
  message: string;
  details?: any;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Track if we're already handling a 401 to prevent multiple simultaneous logouts
let isHandling401 = false;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export class ApiClient {
  private buildHeaders(extra?: HeadersInit): HeadersInit {
    const token = useAuthStore.getState().token;
    console.log("Token=======", token);
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra ?? {}),
    };
  }

  private async doFetch(url: string, init: RequestInit & { timeoutMs?: number }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });

      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async request<T = unknown>(
    path: string,
    options: RequestInit & { timeoutMs?: number; retries?: number } = {},
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    const method = (options.method ?? "GET").toUpperCase();
    const retries = options.retries ?? (method === "GET" ? DEFAULT_RETRY_COUNT : 0);
    let attempt = 0;
    let lastError: any;
    console.log("URL====", url, method);
    while (attempt <= retries) {
      try {
        const res = await this.doFetch(url, {
          ...options,
          headers: this.buildHeaders(options.headers),
        });

        if (res.status === 204) return null as unknown as T;

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const data = isJson ? await res.json().catch(() => ({})) : await res.text();

        if (!res.ok) {
          const err: ApiError = {
            status: res.status,
            code: (data as any)?.code,
            message: (data as any)?.message || `HTTP ${res.status}`,
            details: data,
          };

          // Handle 401 Unauthorized - force logout and redirect to login
          if (res.status === 401) {
            const newToken = await this.handleTokenRefresh();
            if (newToken) {
              // retry original request with new token
              return this.request<T>(path, options);
            }

            // refresh failed → logout
            if (!isHandling401) {
              isHandling401 = true;
              try {
                await triggerUnauthorized();
              } finally {
                setTimeout(() => {
                  isHandling401 = false;
                }, 1000);
              }
            }
          }

          throw err;
        }

        return data as T;
      } catch (err: any) {
        lastError = err;
        const isAbort = err?.name === "AbortError";
        const isNetwork = isAbort || err?.status === undefined; // fetch/network issues
        if (attempt < retries && isNetwork) {
          await sleep(300 * Math.pow(2, attempt));
          attempt += 1;
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  get<T = unknown>(path: string, options?: RequestInit) {
    return this.request<T>(path, { ...(options ?? {}), method: "GET" });
  }
  post<T = unknown>(path: string, body?: any, options?: RequestInit) {
    return this.request<T>(path, {
      ...(options ?? {}),
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
  put<T = unknown>(path: string, body?: any, options?: RequestInit) {
    return this.request<T>(path, {
      ...(options ?? {}),
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
  patch<T = unknown>(path: string, body?: any, options?: RequestInit) {
    return this.request<T>(path, {
      ...(options ?? {}),
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
  delete<T = unknown>(path: string, options?: RequestInit) {
    return this.request<T>(path, { ...(options ?? {}), method: "DELETE" });
  }

  // Form helpers
  postFormUrlEncoded<T = unknown>(path: string, params: Record<string, string>): Promise<T> {
    // ✅ Manual URLSearchParams encoding for Hermes compatibility
    const body = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");

    return this.request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  // Multipart upload (no default JSON content-type; rely on RN to set boundary)
  async postFormData<T = unknown>(
    path: string,
    formData: FormData,
    options?: RequestInit,
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

    const token = useAuthStore.getState().token;

    const res = await this.doFetch(url, {
      ...(options ?? {}),
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
      body: formData as any,
    });

    const text = await res.text();
    console.log("UPLOAD RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    if (!res.ok) {
      if (res.status === 401) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          return this.postFormData<T>(path, formData, options);
        }
        await triggerUnauthorized();
      }

      throw {
        status: res.status,
        message: data?.message,
        details: data,
      };
    }

    return data;
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (!isRefreshing) {
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        refreshPromise = refreshTokenApi(refreshToken)
          .then((res) => {
            const newToken: string = res?.data?.accessToken;

            const user = useAuthStore.getState().user;
            if (newToken && user) {
              useAuthStore.getState().setToken(newToken, user);
              return newToken;
            }

            return null;
          })
          .catch(() => null)
          .finally(() => {
            isRefreshing = false;
          });
      }
    }

    return refreshPromise;
  }
}

export const apiClient = new ApiClient();
