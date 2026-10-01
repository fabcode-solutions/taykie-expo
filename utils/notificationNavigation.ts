import { router, type Href } from "expo-router";
import { NotificationData } from "@/stores/notificationStore";
import { getTipIdFromNotification } from "@/services/api/tips";
import { openTip } from "@/components/tips/TipsRow";

const openProfile = (userId: string) =>
  router.push({ pathname: "/profile/public-profile", params: { userId } } as Href);

// The home tab owns the MedicineTaken modal and opens it for this schedule.
const openSchedule = (scheduleId: string) =>
  router.navigate({ pathname: "/(tabs)", params: { scheduleId } } as Href);

interface NotificationTarget {
  type?: string;
  action?: string | null;
  resourceId?: string | null;
  fromUserId?: string | null;
}

/**
 * Server-provided `action` + `resourceId` win; Follow/Like/Comment rows created before
 * actions existed fall back to the profile of the user who triggered them.
 */
function navigateToTarget(target: NotificationTarget, currentUserId?: string): boolean {
  const { action, resourceId, type, fromUserId } = target;

  switch (action) {
    case "navigate_to_profile":
      if (resourceId) return openProfile(resourceId), true;
      break;
    case "navigate_to_group":
      if (resourceId) {
        router.push({ pathname: "/groups/[groupId]", params: { groupId: resourceId } } as Href);
        return true;
      }
      break;
    case "navigate_to_schedule":
      if (resourceId) return openSchedule(resourceId), true;
      break;
    case "navigate_to_dashboard":
      router.navigate("/(tabs)" as Href);
      return true;
  }

  if (
    (type === "Follow" || type === "Like" || type === "Comment") &&
    fromUserId &&
    fromUserId !== currentUserId
  ) {
    openProfile(fromUserId);
    return true;
  }

  return false;
}

/** Tap on a row of the in-app notification list. Returns false when there is nowhere to go. */
export function openNotification(notification: NotificationData, currentUserId?: string): boolean {
  // Dosage / missed-dose reminders are also "System" rows with a resourceId, so they must be
  // routed by their action *before* the tip check — otherwise the schedule id is opened as a tip.
  const isScheduleReminder =
    notification.action === "navigate_to_schedule" ||
    notification.type === ("dosage_reminder" as string) ||
    notification.type === ("missed_dose" as string);
  if (isScheduleReminder && notification.resourceId) {
    openSchedule(notification.resourceId);
    return true;
  }

  const tipId = getTipIdFromNotification(notification);
  if (tipId) {
    openTip(tipId);
    return true;
  }
  return navigateToTarget(notification, currentUserId);
}

/**
 * Tap on a push (system tray or in-app banner). `data` is the FCM data payload:
 * { type: "dosage_reminder" | "missed_dose", scheduleId } for reminders,
 * { type: "Tip", tipId } for tips, and { type, fromUserId, action?, resourceId? }
 * for social notifications.
 */
export function openPushNotification(
  data?: Record<string, unknown> | null,
  currentUserId?: string,
): boolean {
  if (!data) return false;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

  if (data.type === "Tip") {
    const tipId = str(data.tipId);
    if (tipId) openTip(tipId);
    return !!tipId;
  }

  const scheduleId = str(data.scheduleId);
  if ((data.type === "dosage_reminder" || data.type === "missed_dose") && scheduleId) {
    openSchedule(scheduleId);
    return true;
  }

  if (data.type === "refill_reminder") {
    router.navigate("/(tabs)" as Href);
    return true;
  }

  return navigateToTarget(
    {
      type: str(data.type),
      action: str(data.action),
      resourceId: str(data.resourceId),
      fromUserId: str(data.fromUserId),
    },
    currentUserId,
  );
}
