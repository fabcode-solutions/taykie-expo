import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Taykie",
  slug: "taykieapp",
  version: "1.0.0",
  orientation: "default",
  scheme: "taykie",
  // Localized native strings (iOS permission prompts in Info.plist). English stays
  // in ios.infoPlist below; the Spanish overrides live in i18n/native/es.json. This
  // is native config read at build time, so a new build is required for it to apply.
  locales: {
    es: "./i18n/native/es.json",
  },
  // Locked per brief §Priority 3 ("Dark mode... close to unusable on iOS;
  // date pickers cannot be used at all") until a proper dark theme ships.
  // "automatic" let iOS render native chrome — status bar, keyboard, and
  // DateTimePicker's native spinner in particular — in dark styling while
  // the app's own screens stayed light-themed (the JS theme was never
  // actually wired to dark, see theme/ThemeProvider.tsx), producing that
  // mismatch. This is a native config value read at build time: an OTA
  // update will NOT apply it, a new build is required.
  userInterfaceStyle: "light",
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.taykie.app",
    googleServicesFile: "./GoogleService-Info.plist",
    entitlements: {
      "aps-environment": "production",
    },
    icon: {
      dark: "./assets/images/ios-dark.png",
      light: "./assets/images/ios-light.png",
      tinted: "./assets/images/ios-tinted.png",
    },
    associatedDomains: ["applinks:taykie.com"],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "com.googleusercontent.apps.882421332060-v82q896h0t6ea9k586df320o0vnkk577",
          ],
        },
      ],
      UIBackgroundModes: ["remote-notification", "bluetooth-central"],

      NSCameraUsageDescription: "This app needs access to camera to take profile photos.",
      NSPhotoLibraryUsageDescription:
        "This app needs access to photo library to select profile photos.",
      NSPhotoLibraryAddUsageDescription: "This app needs access to save photos to your library.",
    },
  },

  android: {
    permissions: [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.VIBRATE",
      "android.permission.RECORD_AUDIO",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE",
      "android.permission.POST_NOTIFICATIONS",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    package: "com.taykie.app",
    googleServicesFile: "./google-services.json",

    edgeToEdgeEnabled: true,
  },

  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "./plugins/withBleNative",
    "expo-router",
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Allow Taykie to use Face ID to unlock the app.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#D5C8BD",
        image: "./assets/images/logo-brown.png",
        dark: {
          image: "./assets/images/logo-brown.png",
          backgroundColor: "#D5C8BD",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.0",
          useFrameworks: "static",
        },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: "35.0.0",
        },
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Manrope/Manrope-Light.ttf",
          "./assets/fonts/Manrope/Manrope-ExtraLight.ttf",
          "./assets/fonts/Manrope/Manrope-Regular.ttf",
          "./assets/fonts/Manrope/Manrope-Medium.ttf",
          "./assets/fonts/Manrope/Manrope-SemiBold.ttf",
          "./assets/fonts/Manrope/Manrope-Bold.ttf",
          "./assets/fonts/Manrope/Manrope-ExtraBold.ttf",
          "./assets/fonts/GascogneSerial/Gascogne-Serial.ttf",
        ],
      },
    ],
    "expo-web-browser",
    "expo-localization",
    [
      "expo-image-picker",
      {
        photosPermission: "The app accesses your photos to let you select a profile picture.",
        cameraPermission: "The app accesses your camera to let you take a profile picture.",
      },
    ],
    "expo-apple-authentication",
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: true,
        modes: ["peripheral", "central"],
        bluetoothAlwaysPermission: "Allow $(PRODUCT_NAME) to connect to bluetooth devices",
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: "com.googleusercontent.apps.882421332060-v82q896h0t6ea9k586df320o0vnkk577",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/adaptive-icon.png",
        color: "#ffffff",
        iosDisplayInForeground: true,
        androidMode: "default", // Add this
        androidVibrationPattern: [0, 250, 250, 250], // Add this global default
        // Bundles these as native notification sound resources (iOS: kept
        // as-is in the app bundle; Android: copied into res/raw) so they
        // can be referenced by filename as a real system notification
        // sound, not just played locally via expo-av. Requires a native
        // rebuild to take effect — Metro/Fast Refresh can't pick this up.
        sounds: [
          "./assets/audio/taykie.wav",
          "./assets/audio/verve.wav",
          "./assets/audio/echo.wav",
          "./assets/audio/pulse.wav",
          "./assets/audio/nudge.wav",
          "./assets/audio/shift.wav",
        ],
      },
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "c5d52982-0c5d-44cc-947c-6264897d11ac",
    },
  },

  owner: "taykieapp",
});
