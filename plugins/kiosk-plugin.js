// plugins/kiosk-plugin.js
const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withMainActivity,
  withMainApplication,
  withDangerousMod,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const pkg = { name: "with-kiosk-full-setup", version: "1.4.0" };

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function writeFile(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
  console.log("✅ Created/Updated:", p);
}

// Get android package like "com.meha1999.expokioskprebuild"
function getAppPackage(config) {
  const appPkg =
    (config.android && config.android.package) ||
    config.androidPackage ||
    config.iosBundleIdentifier;
  if (!appPkg)
    throw new Error("Android package not found in config (android.package).");
  return appPkg;
}

const withManifestTweaks = (config) =>
  withAndroidManifest(config, (c) => {
    const appPkg = getAppPackage(c);
    const kioskFqn = `${appPkg}.kiosk`;
    const manifest = c.modResults;

    // permissions
    const perms = [
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.WAKE_LOCK",
      "android.permission.FOREGROUND_SERVICE",
    ];
    manifest.manifest["uses-permission"] =
      manifest.manifest["uses-permission"] || [];
    for (const p of perms) {
      if (
        !manifest.manifest["uses-permission"].some(
          (u) => u.$["android:name"] === p
        )
      ) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": p } });
      }
    }

    const app = manifest.manifest.application[0];

    // BootReceiver
    app.receiver = app.receiver || [];
    if (
      !app.receiver.some(
        (r) => r.$["android:name"] === `${kioskFqn}.BootReceiver`
      )
    ) {
      app.receiver.push({
        $: {
          "android:name": `${kioskFqn}.BootReceiver`,
          "android:exported": "true",
          "android:enabled": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
              {
                $: {
                  "android:name": "android.intent.action.LOCKED_BOOT_COMPLETED",
                },
              },
            ],
          },
        ],
      });
    }

    // KioskService
    app.service = app.service || [];
    if (
      !app.service.some(
        (s) => s.$["android:name"] === `${kioskFqn}.KioskService`
      )
    ) {
      app.service.push({
        $: {
          "android:name": `${kioskFqn}.KioskService`,
          "android:exported": "false",
        },
      });
    }

    return c;
  });

const withMainActivityPatch = (config) =>
  withMainActivity(config, (c) => {
    const appPkg = getAppPackage(c);
    const kioskFqn = `${appPkg}.kiosk`;
    const filePath = c.modResults.path;
    let src = fs.readFileSync(filePath, "utf8");

    // import CrashHandler
    if (!src.includes(`import ${kioskFqn}.CrashHandler`)) {
      src = src.replace(
        /^package[^\n]*\n/,
        (m) => m + `import ${kioskFqn}.CrashHandler\n`
      );
    }

    // add flags + install
    if (!src.includes("CrashHandler.install(")) {
      const needle = /super\.onCreate\(null\)\s*\n/;
      if (needle.test(src)) {
        src = src.replace(
          needle,
          `super.onCreate(null)
    // Kiosk additions
    window.addFlags(
      android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
      android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
      android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
    )
    CrashHandler.install(application)
`
        );
        fs.writeFileSync(filePath, src, "utf8");
        console.log("✅ Patched MainActivity.kt");
      } else {
        console.warn(
          "⚠️ Could not find 'super.onCreate(null)' in MainActivity.kt; please patch manually."
        );
      }
    }
    return c;
  });

const withKioskFiles = (config) =>
  withDangerousMod(config, [
    "android",
    (c) => {
      const projectRoot = c.modRequest.projectRoot;
      const appPkg = getAppPackage(c);
      const pkgPath = appPkg.replace(/\./g, "/");
      const base = path.join(
        projectRoot,
        `android/app/src/main/java/${pkgPath}/kiosk`
      );

      // KioskModule.kt
      writeFile(
        path.join(base, "KioskModule.kt"),
        `package ${appPkg}.kiosk

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
`
      );

      // KioskPackage.kt
      writeFile(
        path.join(base, "KioskPackage.kt"),
        `package ${appPkg}.kiosk

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.ReactApplicationContext

class KioskPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(KioskModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`
      );

      // CrashHandler.kt
      writeFile(
        path.join(base, "CrashHandler.kt"),
        `package ${appPkg}.kiosk

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
`
      );

      // BootReceiver.kt
      writeFile(
        path.join(base, "BootReceiver.kt"),
        `package ${appPkg}.kiosk

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
`
      );

      // KioskService.kt
      writeFile(
        path.join(base, "KioskService.kt"),
        `package ${appPkg}.kiosk

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
`
      );

      return c;
    },
  ]);

const withMainApplicationPatch = (config) =>
  withMainApplication(config, (c) => {
    const appPkg = getAppPackage(c);
    const kioskFqn = `${appPkg}.kiosk`;
    const filePath = c.modResults.path;
    let src = fs.readFileSync(filePath, "utf8");

    // import KioskPackage
    if (!src.includes(`import ${kioskFqn}.KioskPackage`)) {
      src = src.replace(
        /^package[^\n]*\n/,
        (m) => m + `import ${kioskFqn}.KioskPackage\n`
      );
    }

    // add(KioskPackage())
    if (!src.includes("add(KioskPackage())")) {
      const reApply =
        /PackageList\(this\)\.packages\.apply\s*\{\s*([\s\S]*?)\}/m;
      if (reApply.test(src)) {
        src = src.replace(reApply, (match, inner) =>
          inner.includes("add(KioskPackage())")
            ? match
            : `PackageList(this).packages.apply {\n${inner}\n  add(KioskPackage())\n}`
        );
      } else {
        src = src.replace(
          /override fun getPackages\(\): List<ReactPackage>\s*=\s*PackageList\(this\)\.packages/,
          "override fun getPackages(): List<ReactPackage> = PackageList(this).packages.apply {\n  add(KioskPackage())\n}"
        );
      }
    }

    fs.writeFileSync(filePath, src, "utf8");
    console.log("✅ Patched MainApplication.kt");
    return c;
  });

function withKioskFullSetup(config) {
  config = withKioskFiles(config);
  config = withManifestTweaks(config);
  config = withMainActivityPatch(config);
  config = withMainApplicationPatch(config);
  return config;
}

module.exports = createRunOncePlugin(withKioskFullSetup, pkg.name, pkg.version);
