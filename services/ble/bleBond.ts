import { NativeModules, Platform } from "react-native";

// Thin bridge to the small native Android module (BleBondModule.kt) that
// requests a real OS-level Bluetooth bond via BluetoothDevice.createBond().
// react-native-ble-plx doesn't expose bonding at all, and there's no iOS
// equivalent — CoreBluetooth gives the app zero control over triggering
// pairing, it's entirely automatic and driven by the peripheral's own GATT
// security requirements. This is a best-effort experiment for Android only,
// while a real fix (the firmware requiring bonding) is pending from the
// factory — see the BLE findings doc's open question about this.
const { BleBondModule } = NativeModules;

export type BondResult = "already_bonded" | "bonded" | "unsupported";

export async function requestBond(deviceId: string): Promise<BondResult> {
  if (Platform.OS !== "android" || !BleBondModule) {
    return "unsupported";
  }
  return BleBondModule.createBond(deviceId);
}
