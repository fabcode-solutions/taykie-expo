package com.taykie.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

// Keeps this app's process alive at foreground priority while a Taykie
// device is connected, so Android doesn't reclaim/kill the process just
// because the user swiped the app away from Recents — the same mechanism
// music players and fitness-tracker companion apps use to survive that.
//
// This service does NOT do any BLE work itself. react-native-ble-plx's
// BleManager and all the existing connect/reconnect/poll logic in
// bleStore.ts keep running exactly as before, inside this same (now
// foreground-protected) process — this is purely about process survival,
// not a second BLE implementation living in native code.
class BleForegroundService : Service() {

  companion object {
    private const val CHANNEL_ID = "taykie_ble_connection"
    private const val NOTIFICATION_ID = 4201
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForegroundCompat()
    // START_STICKY: if the process is still killed under genuine memory
    // pressure despite the foreground priority, ask Android to recreate
    // this service (and so re-protect the process) once resources free up,
    // rather than leaving it gone for good.
    return START_STICKY
  }

  private fun startForegroundCompat() {
    createChannelIfNeeded()

    val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      openAppIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Taykie connected")
      .setContentText("Keeping your Taykie device connected in the background.")
      .setSmallIcon(R.drawable.notification_icon)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Taykie BLE Connection",
      NotificationManager.IMPORTANCE_LOW,
    )
    channel.description = "Shown while the app keeps your Taykie device connected in the background."
    manager.createNotificationChannel(channel)
  }
}
