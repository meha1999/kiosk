package com.meha1999.expokioskprebuild.kiosk

import android.app.Application
import android.content.Intent
import android.os.Process

object CrashHandler : Thread.UncaughtExceptionHandler {
  private var defaultHandler: Thread.UncaughtExceptionHandler? = null
  private var app: Application? = null

  fun install(app_: Application) {
    app = app_
    defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler(this)
  }

  override fun uncaughtException(t: Thread, e: Throwable) {
    try {
      val i = app?.packageManager?.getLaunchIntentForPackage(app!!.packageName)
      i?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      app?.startActivity(i)
    } catch (_: Exception) {}
    defaultHandler?.uncaughtException(t, e)
    Process.killProcess(Process.myPid())
    System.exit(10)
  }
}
