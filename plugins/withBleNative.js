const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withMainApplication, withDangerousMod } = require("@expo/config-plugins");

// Persists the BLE native additions (Kotlin source files, the manifest
// <service> entry, and the MainApplication package registration) across
// `expo prebuild` — the generated android/ directory is gitignored and
// gets wiped/regenerated on a clean prebuild, a fresh checkout, or an EAS
// build, so anything hand-edited directly in android/ only survives on the
// machine that edited it. This plugin re-applies those same changes every
// time prebuild runs, from files tracked in ./plugins/android-native.
//
// Permissions (FOREGROUND_SERVICE, FOREGROUND_SERVICE_CONNECTED_DEVICE,
// POST_NOTIFICATIONS) are NOT handled here — they're already declared via
// the top-level `android.permissions` array in app.config.ts, which Expo's
// built-in permissions plugin persists on its own.

const NATIVE_FILES = [
  "BleBondModule.kt",
  "BleBondPackage.kt",
  "BleForegroundService.kt",
  "BleForegroundServiceModule.kt",
];

function withBleNativeFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const packagePath = (config.android?.package ?? "com.taykie.app").split(".").join(path.sep);
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/java",
        packagePath,
      );
      fs.mkdirSync(destDir, { recursive: true });

      const sourceDir = path.join(__dirname, "android-native");
      for (const fileName of NATIVE_FILES) {
        fs.copyFileSync(path.join(sourceDir, fileName), path.join(destDir, fileName));
      }

      return config;
    },
  ]);
}

function withBleForegroundServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.service = application.service ?? [];

    const alreadyDeclared = application.service.some(
      (service) => service.$?.["android:name"] === ".BleForegroundService",
    );
    if (!alreadyDeclared) {
      application.service.push({
        $: {
          "android:name": ".BleForegroundService",
          "android:foregroundServiceType": "connectedDevice",
          "android:exported": "false",
        },
      });
    }

    return config;
  });
}

function withBleBondPackageRegistration(config) {
  return withMainApplication(config, (config) => {
    if (config.modResults.language !== "kt") {
      throw new Error(
        "withBleNative expected a Kotlin MainApplication.kt — this project's native template may have changed.",
      );
    }

    if (!config.modResults.contents.includes("BleBondPackage()")) {
      config.modResults.contents = config.modResults.contents.replace(
        /(val packages = PackageList\(this\)\.packages\n)/,
        `$1            packages.add(BleBondPackage())\n`,
      );
    }

    return config;
  });
}

module.exports = function withBleNative(config) {
  config = withBleNativeFiles(config);
  config = withBleForegroundServiceManifest(config);
  config = withBleBondPackageRegistration(config);
  return config;
};
