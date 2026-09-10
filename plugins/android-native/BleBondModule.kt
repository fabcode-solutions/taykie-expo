package com.taykie.app

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

private const val TAG = "BleBondModule"

// Experimental: the Taykie device's current firmware doesn't require BLE
// bonding (see BLEService's app-level password handshake, used instead of
// real Bluetooth security) — but Android lets an app REQUEST a bond even
// when the peripheral doesn't require one for its GATT operations. This is
// a best-effort attempt to get a real OS-level bond going while waiting on
// a firmware change from the factory (see the BLE findings doc's open
// question about this). react-native-ble-plx doesn't expose bonding at all,
// hence this small native bridge. No equivalent exists on iOS — CoreBluetooth
// gives the app no control over triggering pairing.
class BleBondModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "BleBondModule"

  @ReactMethod
  fun createBond(deviceId: String, promise: Promise) {
    Log.d(TAG, "createBond() called for $deviceId")
    try {
      val adapter = BluetoothAdapter.getDefaultAdapter()
      if (adapter == null) {
        Log.w(TAG, "No Bluetooth adapter available")
        promise.reject("NO_ADAPTER", "No Bluetooth adapter available on this device")
        return
      }

      val device: BluetoothDevice = adapter.getRemoteDevice(deviceId)
      Log.d(TAG, "Current bond state for $deviceId: ${bondStateName(device.bondState)}")

      if (device.bondState == BluetoothDevice.BOND_BONDED) {
        Log.d(TAG, "Already bonded — nothing to do")
        promise.resolve("already_bonded")
        return
      }

      val filter = IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          val changedDevice = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
          if (changedDevice == null || changedDevice.address != device.address) return

          val state = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)
          Log.d(TAG, "Bond state changed for ${device.address}: ${bondStateName(state)}")
          when (state) {
            BluetoothDevice.BOND_BONDED -> {
              Log.i(TAG, "Bonding SUCCEEDED for ${device.address}")
              try { reactApplicationContext.unregisterReceiver(this) } catch (e: Exception) {}
              promise.resolve("bonded")
            }
            BluetoothDevice.BOND_NONE -> {
              Log.w(TAG, "Bonding FAILED/REJECTED for ${device.address} — firmware likely doesn't support it")
              try { reactApplicationContext.unregisterReceiver(this) } catch (e: Exception) {}
              promise.reject("BOND_REJECTED", "Bonding failed or was rejected by the device/firmware")
            }
            // BOND_BONDING: still in progress, nothing to resolve yet.
          }
        }
      }

      // API 33+ requires an explicit exported/not-exported flag or this
      // throws a SecurityException at runtime — ContextCompat handles the
      // pre-33 fallback where that overload doesn't exist. This is a system
      // broadcast (sent by the OS itself), so RECEIVER_NOT_EXPORTED is
      // correct — no other app needs to send this receiver anything.
      ContextCompat.registerReceiver(
        reactApplicationContext,
        receiver,
        filter,
        ContextCompat.RECEIVER_NOT_EXPORTED,
      )

      val started = device.createBond()
      Log.d(TAG, "createBond() native call returned: $started")
      if (!started) {
        try { reactApplicationContext.unregisterReceiver(receiver) } catch (e: Exception) {}
        promise.reject("BOND_START_FAILED", "createBond() returned false — device may not support bonding")
      }
    } catch (e: SecurityException) {
      Log.e(TAG, "Missing permission for createBond()", e)
      promise.reject("PERMISSION_DENIED", "Missing BLUETOOTH_CONNECT permission", e)
    } catch (e: Exception) {
      Log.e(TAG, "Unexpected error in createBond()", e)
      promise.reject("BOND_ERROR", e.message, e)
    }
  }

  private fun bondStateName(state: Int): String = when (state) {
    BluetoothDevice.BOND_BONDED -> "BOND_BONDED"
    BluetoothDevice.BOND_BONDING -> "BOND_BONDING"
    BluetoothDevice.BOND_NONE -> "BOND_NONE"
    else -> "UNKNOWN($state)"
  }

  @ReactMethod
  fun getBondState(deviceId: String, promise: Promise) {
    try {
      val adapter = BluetoothAdapter.getDefaultAdapter()
      val device = adapter?.getRemoteDevice(deviceId)
      val state = when (device?.bondState) {
        BluetoothDevice.BOND_BONDED -> "bonded"
        BluetoothDevice.BOND_BONDING -> "bonding"
        else -> "none"
      }
      promise.resolve(state)
    } catch (e: Exception) {
      promise.reject("BOND_STATE_ERROR", e.message, e)
    }
  }
}
