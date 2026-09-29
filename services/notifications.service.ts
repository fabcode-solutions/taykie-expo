import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { format } from "date-fns";
import { router, type Href } from "expo-router";
import i18n from "@/i18n";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { getDateLocale } from "@/utils/date";
import { resolveLidEvent, type LidOpenEvent } from "@/services/api/device";
import { queryClient } from "@/hooks/queries/queryClient";
import { lidEventKeys } from "@/hooks/queries/lidEvents";

// ---------------------------------------------------------------------------
// Lid-open notification ("Taykie was opened at 8:04am. What did you do?")
// ---------------------------------------------------------------------------

export const LID_OPEN_CATEGORY = "LID_OPEN";
export const LID_OPEN_NOTIFICATION_TYPE = "LidOpen";
const LID_OPEN_ANDROID_CHANNEL = "lid_open";

export const LID_OPEN_ACTION = {
  TOOK_DOSE: "took_dose",
  REFILLED: "refilled",
  DISMISS: "dismiss",
} as const;

export interface LidOpenNotificationData {
  type: typeof LID_OPEN_NOTIFICATION_TYPE;
  eventId: string;
  openedAt: string; // ISO
}

/** "8:04am" — always 12-hour AM/PM, regardless of locale. */
export function formatOpenTime(openedAt: Date): string {
  return format(openedAt, "h:mmaaa", { locale: getDateLocale() });
}

/**
 * Registers the three-action category. Call once at startup, before any lid
 * notification can be shown (also re-run when the language changes so the
 * button labels follow it).
 */
export async function registerLidOpenCategory(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(LID_OPEN_ANDROID_CHANNEL, {
      name: "Lid opened",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }

  // Both answering actions open the app: the answer needs a network call and
  // iOS does not reliably run JS for background-only actions on a killed app.
  // Dismiss does not open the app; the event simply stays unconfirmed.
  await Notifications.setNotificationCategoryAsync(LID_OPEN_CATEGORY, [
    {
      identifier: LID_OPEN_ACTION.TOOK_DOSE,
      buttonTitle: i18n.t(LocalizedStrings.lidEvent.tookDose),
      options: { opensAppToForeground: true },
    },
    {
      identifier: LID_OPEN_ACTION.REFILLED,
      buttonTitle: i18n.t(LocalizedStrings.lidEvent.refilled),
      options: { opensAppToForeground: true },
    },
    {
      identifier: LID_OPEN_ACTION.DISMISS,
      buttonTitle: i18n.t(LocalizedStrings.lidEvent.dismiss),
      options: { opensAppToForeground: false },
    },
  ]);
}

/** Local notification asking what the user did when the lid opened. */
export async function showLidOpenNotification(eventId: string, openedAt: Date): Promise<void> {
  const data: LidOpenNotificationData = {
    type: LID_OPEN_NOTIFICATION_TYPE,
    eventId,
    openedAt: openedAt.toISOString(),
  };

  await Notifications.scheduleNotificationAsync({
    // One notification per event: a repeat for the same event replaces it
    identifier: `lid-open-${eventId}`,
    content: {
      title: i18n.t(LocalizedStrings.lidEvent.title),
      body: i18n.t(LocalizedStrings.lidEvent.body, { time: formatOpenTime(openedAt) }),
      data: data as unknown as Record<string, unknown>,
      categoryIdentifier: LID_OPEN_CATEGORY,
      sound: "default",
    },
    trigger: Platform.OS === "android" ? { channelId: LID_OPEN_ANDROID_CHANNEL } : null,
  });
}

export async function clearLidOpenNotification(eventId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(`lid-open-${eventId}`);
}

// ---------------------------------------------------------------------------
// Answering the notification
// ---------------------------------------------------------------------------

// A response can be delivered more than once (listener + last-response on cold start)
const handledResponses = new Set<string>();

/**
 * Handles a tap on the lid-open notification or one of its actions.
 * Returns true when the response belonged to a lid-open notification.
 *
 *  - "I took a dose"       → dose picker for that event
 *  - "I refilled the box"  → refill logged, no dose
 *  - "Dismiss"             → nothing; the event stays unconfirmed in history
 *  - tapping the body      → dose picker (which also offers the refill answer)
 */
export async function handleLidOpenResponse(
  response: Notifications.NotificationResponse,
): Promise<boolean> {
  const data = response.notification.request.content.data as Partial<LidOpenNotificationData>;
  if (data?.type !== LID_OPEN_NOTIFICATION_TYPE || !data.eventId) return false;

  const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  if (handledResponses.has(key)) return true;
  handledResponses.add(key);

  const { eventId, openedAt } = data;
  const openPicker = () =>
    router.push({
      pathname: "/lid-events/[eventId]",
      params: { eventId, openedAt: openedAt ?? "" },
    } as Href);

  switch (response.actionIdentifier) {
    case LID_OPEN_ACTION.DISMISS:
      return true;

    case LID_OPEN_ACTION.REFILLED:
      try {
        await resolveLidEvent(eventId, { action: "refill" });
        queryClient.invalidateQueries({ queryKey: lidEventKeys.all });
      } catch (error) {
        console.error("Failed to log refill from notification:", error);
        // Let the user retry from the event screen rather than losing the answer
        openPicker();
      }
      return true;

    default:
      openPicker();
      return true;
  }
}

// ---------------------------------------------------------------------------
// From the F6 history poll
// ---------------------------------------------------------------------------

// The device only logs opens (no real-time event), so the app learns of them on
// its next history read. An open this recent is treated as "just happened" and
// gets the notification; anything older was missed while the phone was away and
// only appears in the unconfirmed list, with no late push (brief P1.7).
export const LID_LIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Newly-created (not merged into an existing one) lid events that are still
 * recent enough to treat as "just happened" — shared by the OS notification
 * path below and the in-app prompt (see bleStore's F6 handler), so both use
 * the exact same "is this fresh" rule.
 */
export function getFreshLidEvents(
  results: { event: LidOpenEvent; isNew: boolean }[],
  now: Date = new Date(),
): LidOpenEvent[] {
  return results
    .filter(({ isNew }) => isNew)
    .map(({ event }) => event)
    .filter((event) => now.getTime() - new Date(event.openedAt).getTime() <= LID_LIVE_WINDOW_MS);
}

/** Raises the notification for freshly created lid events that are still recent. */
export async function notifyNewLidEvents(
  results: { event: LidOpenEvent; isNew: boolean }[],
  now: Date = new Date(),
): Promise<void> {
  for (const event of getFreshLidEvents(results, now)) {
    try {
      await showLidOpenNotification(event.id, new Date(event.openedAt));
    } catch (error) {
      console.error("Failed to show lid-open notification:", error);
    }
  }
}
