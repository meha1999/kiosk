package com.meha1999.expokioskprebuild.kiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
        intent.action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        context.startActivity(launch)
      }
      val svc = Intent(context, KioskService::class.java)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(svc) else context.startService(svc)
    }
  }
}
