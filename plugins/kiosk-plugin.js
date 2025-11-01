// plugins/kiosk-plugin.js
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  createRunOncePlugin,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/** Get android package across SDKs */
function getAndroidPackage(expoConfig) {
  const fromAPI =
    AndroidConfig?.Package?.getPackage?.(expoConfig) ??
    AndroidConfig?.Package?.getAndroidPackage?.(expoConfig);
  return (
    fromAPI ??
    expoConfig?.android?.package ??
    expoConfig?.expo?.android?.package ??
    null
  );
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function writeOnce(filePath, contents) {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, contents);
}

/** Kotlin MainActivity with immersive “kiosk-like” UI (no local overrides that break compilation) */
function mainActivityKotlin(pkg) {
  return `package ${pkg}

import android.os.Bundle
import android.view.View
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  private fun enterImmersiveSticky() {
    window.decorView.systemUiVisibility =
      (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_FULLSCREEN)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enterImmersiveSticky()
  }

  override fun onResume() {
    super.onResume()
    enterImmersiveSticky()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) enterImmersiveSticky()
  }
}
`;
}

/** Boot receiver so the app can auto-start after reboot (optional) */
function bootReceiverJava(pkg) {
  return `package ${pkg};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
      Intent i = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
      if (i != null) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(i);
      }
    }
  }
}
`;
}

/** Manifest edits: permissions, BootReceiver, HOME-category launcher */
function addManifestBits(androidManifest) {
  const manifestRoot = androidManifest.manifest;
  const app = manifestRoot.application?.[0];
  if (!app) return androidManifest;

  // Permissions
  manifestRoot["uses-permission"] = manifestRoot["uses-permission"] ?? [];
  const addPerm = (name) => {
    if (
      !manifestRoot["uses-permission"].some((p) => p.$["android:name"] === name)
    ) {
      manifestRoot["uses-permission"].push({ $: { "android:name": name } });
    }
  };
  addPerm("android.permission.RECEIVE_BOOT_COMPLETED");
  addPerm("android.permission.WAKE_LOCK");

  // Boot receiver
  app.receiver = app.receiver ?? [];
  if (!app.receiver.some((r) => r.$?.["android:name"] === ".BootReceiver")) {
    app.receiver.push({
      $: {
        "android:name": ".BootReceiver",
        "android:enabled": "true",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
          ],
        },
      ],
    });
  }

  // Make MainActivity a launcher + HOME
  const activities = app.activity ?? [];
  const main = activities.find((a) =>
    (a?.$?.["android:name"] || "").endsWith(".MainActivity")
  );
  if (main) {
    main.$["android:exported"] = "true";
    main["intent-filter"] = main["intent-filter"] ?? [];
    const alreadyHome = main["intent-filter"].some((f) =>
      (f.category || []).some(
        (c) => c.$?.["android:name"] === "android.intent.category.HOME"
      )
    );
    if (!alreadyHome) {
      main["intent-filter"].push({
        action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
        category: [
          { $: { "android:name": "android.intent.category.LAUNCHER" } },
          { $: { "android:name": "android.intent.category.DEFAULT" } },
          { $: { "android:name": "android.intent.category.HOME" } },
        ],
      });
    }
  }

  return androidManifest;
}

const withKiosk = (config) => {
  const androidPackage = getAndroidPackage(config);
  if (!androidPackage) {
    throw new Error(
      'Cannot determine android.package. Set it in app.json under { "android": { "package": "com.your.app" } }.'
    );
  }

  // 1) Manifest edits
  config = withAndroidManifest(config, (c) => {
    c.modResults = addManifestBits(c.modResults);
    return c;
  });

  // 2) Write sources (don’t rely on withMainActivity)
  config = withDangerousMod(config, [
    "android",
    async (c) => {
      const srcBase = path.join(
        c.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...androidPackage.split(".")
      );
      writeOnce(
        path.join(srcBase, "MainActivity.kt"),
        mainActivityKotlin(androidPackage)
      );
      writeOnce(
        path.join(srcBase, "BootReceiver.java"),
        bootReceiverJava(androidPackage)
      );
      return c;
    },
  ]);

  return config;
};

module.exports = createRunOncePlugin(withKiosk, "kiosk-plugin", "1.0.1");
