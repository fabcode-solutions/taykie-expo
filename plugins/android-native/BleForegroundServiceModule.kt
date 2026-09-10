package com.taykie.app

import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

private const val TAG = "BleForegroundServiceModule"

class BleForegroundServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "BleForegroundServiceModule"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      val intent = Intent(reactApplicationContext, BleForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactApplicationContext.startForegroundService(intent)
      } else {
        reactApplicationContext.startService(intent)
      }
      Log.d(TAG, "BleForegroundService start requested")
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start BleForegroundService", e)
      promise.reject("FOREGROUND_SERVICE_START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      reactApplicationContext.stopService(Intent(reactApplicationContext, BleForegroundService::class.java))
      Log.d(TAG, "BleForegroundService stop requested")
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to stop BleForegroundService", e)
      promise.reject("FOREGROUND_SERVICE_STOP_FAILED", e.message, e)
    }
  }
}
