import { NativeModules, Platform } from "react-native";

// Bridge to the small native Android module (BleForegroundServiceModule.kt)
// that starts/stops BleForegroundService — a foreground service whose only
// job is to keep this app's process alive (with a persistent notification)
// so Android doesn't kill it just because the user swiped it away from
// Recents. No BLE work happens in the service itself; it purely protects
// the process so the existing BleManager/bleStore connect-reconnect-poll
// logic keeps running uninterrupted.
//
// No iOS equivalent: iOS has no foreground-service concept, and — more
// fundamentally — a user manually force-quitting an app from the app
// switcher is a hard OS policy on iOS that blocks ANY background relaunch
// until the user reopens the app themselves. Nothing app-side can override
// that, so these are no-ops on iOS.
const { BleForegroundServiceModule } = NativeModules;

export async function startBleForegroundService(): Promise<void> {
  if (Platform.OS !== "android" || !BleForegroundServiceModule) return;
  try {
    await BleForegroundServiceModule.start();
  } catch (error) {
    console.warn("Failed to start BLE foreground service:", error);
  }
}

export async function stopBleForegroundService(): Promise<void> {
  if (Platform.OS !== "android" || !BleForegroundServiceModule) return;
  try {
    await BleForegroundServiceModule.stop();
  } catch (error) {
    console.warn("Failed to stop BLE foreground service:", error);
  }
}
