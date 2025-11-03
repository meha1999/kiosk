package com.meha1999.expokioskprebuild.kiosk

import android.app.Activity
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KioskModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "Kiosk"

  @ReactMethod
  fun startLockTask(promise: Promise) {
    val activity: Activity? = reactContext.currentActivity
    if (activity == null) { promise.reject("NO_ACTIVITY", "No activity"); return }
    try { activity.startLockTask(); promise.resolve(true) }
    catch (e: Exception) { promise.reject("LOCK_FAIL", e) }
  }

  @ReactMethod
  fun stopLockTask(promise: Promise) {
    val activity: Activity? = reactContext.currentActivity
    if (activity == null) { promise.reject("NO_ACTIVITY", "No activity"); return }
    try { activity.stopLockTask(); promise.resolve(true) }
    catch (e: Exception) { promise.reject("UNLOCK_FAIL", e) }
  }

  @ReactMethod
  fun setKioskWindowFlags(promise: Promise) {
    val activity: Activity? = reactContext.currentActivity
    if (activity == null) { promise.reject("NO_ACTIVITY", "No activity"); return }
    activity.runOnUiThread {
      @Suppress("DEPRECATION")
      activity.window.addFlags(
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
      )
      promise.resolve(true)
    }
  }
}
