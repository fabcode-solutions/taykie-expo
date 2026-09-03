import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import { isNotificationSoundEnabled, useNotificationStore } from "@/stores/notificationStore";
import { PermissionsAndroid, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useBannerStore } from "@/stores/bannerStore";
import { useBLEStore } from "@/stores/bleStore";
import { toneFileName, toneSlug } from "@/utils/toneAudio";
import { isDosageReminder, triggerDeviceSoundForReminder } from "@/utils/reminderSound";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
export function usePushNotifications() {
  const alert = useAlert();
  const { registerFCMToken } = useNotificationStore();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      if (Platform.OS === "ios") {
        await messaging().registerDeviceForRemoteMessages();
      }

      const granted = await requestPermission();
      if (granted) {
        await registerToken();
      }

      unsubscribe = listenForeground();
    };

    setup();
    return () => unsubscribe?.();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      if (Number(Platform.Version) >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return status === "granted";
  };

  const registerToken = async () => {
    try {
      const token = await messaging().getToken();
      console.log("📲 FCM Token:", token);
      if (!token) return;

      const existing = useNotificationStore.getState().fcmToken;
      if (token !== existing) {
        await registerFCMToken(token);
      }
    } catch (error) {
      alert.show(AlertPresets.error("❌ FCM Token Error", error.message));
    }
  };

  const listenForeground = () => {
    return messaging().onMessage(async (remoteMessage) => {
      console.log("📩 Foreground message processed:", remoteMessage);

      if (Platform.OS === "android") {
        showLocalNotification(remoteMessage);
      } else {
        useBannerStore.getState().showBanner(remoteMessage);
      }
      await useNotificationStore.getState().fetchNotifications();
    });
  };
}

// Sound-enabled channel ids are suffixed with the tone slug (e.g.
// "sound_vibrate_lock_taykie") since an Android channel's sound can't be
// changed after creation — a different tone means a different channel, not
// an update to the existing one. Silent channels need no suffix; they never
// reference a tone.
const soundChannelId = (base: string, toneIndex: number | null | undefined) =>
  `${base}_${toneSlug(toneIndex)}`;

export const showLocalNotification = async (remoteMessage: any) => {
  const soundEnabled = isNotificationSoundEnabled(remoteMessage?.data?.type);

  const settings = useNotificationStore.getState().notificationSettings;
  const vibrationEnabled = settings?.notifications?.vibration ?? false;
  const lockScreenEnabled = settings?.notifications?.showOnLockScreen ?? true;
  const toneIndex = useBLEStore.getState().toneIndex;
  const toneFile = toneFileName(toneIndex);

  let baseChannelId = "silent_novibrate";
  if (soundEnabled && vibrationEnabled) {
    baseChannelId = "sound_vibrate";
  } else if (soundEnabled && !vibrationEnabled) {
    baseChannelId = "sound_novibrate";
  } else if (!soundEnabled && vibrationEnabled) {
    baseChannelId = "silent_vibrate";
  }

  let targetChannelId = `${baseChannelId}_${lockScreenEnabled ? "lock" : "nolock"}`;
  if (soundEnabled) {
    targetChannelId = soundChannelId(targetChannelId, toneIndex);
  }

  await Notifications.scheduleNotificationAsync({
    identifier: remoteMessage.messageId,
    content: {
      title: remoteMessage.notification?.title || "New Notification",
      body: remoteMessage.notification?.body || "",
      data: remoteMessage.data,
      // Falls back to "default" if sound is on but no tone is selected
      // (Mute, or nothing chosen yet) rather than silently going silent.
      sound: soundEnabled ? (toneFile ?? "default") : undefined,
      vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
    },
    trigger: Platform.OS === "android" ? { channelId: targetChannelId } : null,
  });

  // The custom banner (iOS-only) triggers the physical device for dosage
  // reminders; this is the Android-foreground equivalent, since Android
  // foreground messages go through this local-notification path instead of
  // the banner. No lingering UI element to hook a "stop" to here, so this
  // relies on BLEService.triggerSound's own ~60s safety timer to end it.
  if (isDosageReminder(remoteMessage)) {
    triggerDeviceSoundForReminder();
  }
};

// Pass the currently selected tone index; call again whenever it changes
// (see app/_layout.tsx) so a new tone gets its own channel. previousToneIndex
// lets old sound channels for a since-abandoned tone get cleaned up instead
// of accumulating forever in the system's per-app channel list.
export const setupNotificationChannels = async (
  toneIndex: number | null | undefined = null,
  previousToneIndex: number | null | undefined = null,
) => {
  if (Platform.OS !== "android") return;

  const vibrationPattern = [0, 250, 250, 250];
  const toneFile = toneFileName(toneIndex);

  const soundBaseIds = [
    "sound_vibrate_lock",
    "sound_vibrate_nolock",
    "sound_novibrate_lock",
    "sound_novibrate_nolock",
  ];

  if (
    previousToneIndex !== null &&
    previousToneIndex !== undefined &&
    previousToneIndex !== toneIndex
  ) {
    for (const base of soundBaseIds) {
      await Notifications.deleteNotificationChannelAsync(
        soundChannelId(base, previousToneIndex),
      ).catch(() => {});
    }
  }

  // Define our 3 boolean axes: Sound, Vibrate, LockScreen
  const configurations = [
    { sound: true, vibrate: true, lock: true, id: soundChannelId("sound_vibrate_lock", toneIndex) },
    {
      sound: true,
      vibrate: true,
      lock: false,
      id: soundChannelId("sound_vibrate_nolock", toneIndex),
    },
    {
      sound: true,
      vibrate: false,
      lock: true,
      id: soundChannelId("sound_novibrate_lock", toneIndex),
    },
    {
      sound: true,
      vibrate: false,
      lock: false,
      id: soundChannelId("sound_novibrate_nolock", toneIndex),
    },
    { sound: false, vibrate: true, lock: true, id: "silent_vibrate_lock" },
    { sound: false, vibrate: true, lock: false, id: "silent_vibrate_nolock" },
    { sound: false, vibrate: false, lock: true, id: "silent_novibrate_lock" },
    { sound: false, vibrate: false, lock: false, id: "silent_novibrate_nolock" },
  ];

  for (const config of configurations) {
    await Notifications.setNotificationChannelAsync(config.id, {
      name: `${config.sound ? "Sound" : "Silent"}, ${config.vibrate ? "Vibrate" : "No Vibrate"} (${config.lock ? "Lock Screen" : "Hidden"})`,
      importance: Notifications.AndroidImportance.MAX,
      // Falls back to "default" if this is a sound channel but no tone is
      // selected (Mute, or nothing chosen yet).
      sound: config.sound ? (toneFile ?? "default") : null,
      enableVibrate: config.vibrate,
      vibrationPattern: config.vibrate ? vibrationPattern : undefined,
      // Here is the lock screen magic:
      lockscreenVisibility: config.lock
        ? Notifications.AndroidNotificationVisibility.PUBLIC
        : Notifications.AndroidNotificationVisibility.SECRET,
    });
  }
};
