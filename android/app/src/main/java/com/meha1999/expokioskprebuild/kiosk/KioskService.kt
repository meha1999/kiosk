package com.meha1999.expokioskprebuild.kiosk

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder

class KioskService : Service() {
  override fun onCreate() {
    super.onCreate()
    val channelId = "kiosk_service"
    if (Build.VERSION.SDK_INT >= 26) {
      val nm = getSystemService(NotificationManager::class.java)
      val ch = NotificationChannel(channelId, "Kiosk", NotificationManager.IMPORTANCE_LOW)
      nm.createNotificationChannel(ch)
    }
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pi = PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE)
    val n = Notification.Builder(this, if (Build.VERSION.SDK_INT >= 26) channelId else "")
      .setContentTitle("Kiosk running")
      .setContentText("Keeping the app active")
      .setSmallIcon(android.R.drawable.stat_notify_more)
      .setContentIntent(pi)
      .build()
    startForeground(1, n)
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
  override fun onBind(intent: Intent?): IBinder? = null
}
