import { apiClient } from "./client";
import { endpoints } from "./endpoints";

/** A published health tip written by a Taykie admin (see backend /api/v1/tips). */
export interface Tip {
  id: string;
  title: string;
  body: string;
  image: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  createdAt: string | null;
  author?: { id: string; firstName: string | null; lastName: string | null } | null;
}

export interface TipsPage {
  tips: Tip[];
  total: number;
  /** false when the user didn't opt in to tips on the onboarding Coaching & Tips screen. */
  tipsEnabled: boolean;
}

export async function getTips(page: number = 1, limit: number = 10): Promise<TipsPage> {
  const response = await apiClient.get<{
    data: Tip[];
    meta?: { total?: number; tipsEnabled?: boolean };
  }>(`${endpoints.tips.tips}?page=${page}&limit=${limit}`);
  return {
    tips: Array.isArray(response?.data) ? response.data : [],
    total: response?.meta?.total ?? 0,
    tipsEnabled: response?.meta?.tipsEnabled ?? false,
  };
}

export async function getTipById(tipId: string): Promise<Tip> {
  const response = await apiClient.get<{ data: Tip }>(`${endpoints.tips.tips}/${tipId}`);
  return response.data;
}

/**
 * "New tip" notifications are stored as type "System" with resourceId = the tip's id
 * (see backend tipService.notifyTipPublished). No other System notification sets a
 * resourceId, so this identifies them without a separate notification type.
 */
export const getTipIdFromNotification = (notification: {
  type?: string;
  resourceId?: string | null;
}): string | null =>
  notification?.type === "System" && notification.resourceId ? notification.resourceId : null;
