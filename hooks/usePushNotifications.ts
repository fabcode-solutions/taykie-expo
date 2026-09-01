import { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import { isNotificationSoundEnabled, useNotificationStore } from "@/stores/notificationStore";
import { PermissionsAndroid, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useBannerStore } from "@/stores/bannerStore";
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

export const showLocalNotification = async (remoteMessage: any) => {
  const soundEnabled = isNotificationSoundEnabled(remoteMessage?.data?.type);

  const settings = useNotificationStore.getState().notificationSettings;
  const vibrationEnabled = settings?.notifications?.vibration ?? false;
  const lockScreenEnabled = settings?.notifications?.showOnLockScreen ?? true;
  let baseChannelId = "silent_novibrate";
  if (soundEnabled && vibrationEnabled) {
    baseChannelId = "sound_vibrate";
  } else if (soundEnabled && !vibrationEnabled) {
    baseChannelId = "sound_novibrate";
  } else if (!soundEnabled && vibrationEnabled) {
    baseChannelId = "silent_vibrate";
  }

  const targetChannelId = `${baseChannelId}_${lockScreenEnabled ? "lock" : "nolock"}`;

  await Notifications.scheduleNotificationAsync({
    identifier: remoteMessage.messageId,
    content: {
      title: remoteMessage.notification?.title || "New Notification",
      body: remoteMessage.notification?.body || "",
      data: remoteMessage.data,
      sound: soundEnabled ? "default" : null,
      vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
    },
    trigger: Platform.OS === "android" ? { channelId: targetChannelId } : null,
  });
};

export const setupNotificationChannels = async () => {
  if (Platform.OS !== "android") return;

  const vibrationPattern = [0, 250, 250, 250];

  // Define our 3 boolean axes: Sound, Vibrate, LockScreen
  const configurations = [
    { sound: true, vibrate: true, lock: true, id: "sound_vibrate_lock" },
    { sound: true, vibrate: true, lock: false, id: "sound_vibrate_nolock" },
    { sound: true, vibrate: false, lock: true, id: "sound_novibrate_lock" },
    { sound: true, vibrate: false, lock: false, id: "sound_novibrate_nolock" },
    { sound: false, vibrate: true, lock: true, id: "silent_vibrate_lock" },
    { sound: false, vibrate: true, lock: false, id: "silent_vibrate_nolock" },
    { sound: false, vibrate: false, lock: true, id: "silent_novibrate_lock" },
    { sound: false, vibrate: false, lock: false, id: "silent_novibrate_nolock" },
  ];

  for (const config of configurations) {
    await Notifications.setNotificationChannelAsync(config.id, {
      name: `${config.sound ? "Sound" : "Silent"}, ${config.vibrate ? "Vibrate" : "No Vibrate"} (${config.lock ? "Lock Screen" : "Hidden"})`,
      importance: Notifications.AndroidImportance.MAX,
      sound: config.sound ? "default" : null,
      enableVibrate: config.vibrate,
      vibrationPattern: config.vibrate ? vibrationPattern : undefined,
      // Here is the lock screen magic:
      lockscreenVisibility: config.lock
        ? Notifications.AndroidNotificationVisibility.PUBLIC
        : Notifications.AndroidNotificationVisibility.SECRET,
    });
  }
};
