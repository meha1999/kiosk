import { NativeModules, Platform } from "react-native";

type KioskNative = {
  startLockTask: () => Promise<boolean>;
  stopLockTask: () => Promise<boolean>;
  setKioskWindowFlags: () => Promise<boolean>;
};

const { Kiosk } = NativeModules as { Kiosk?: KioskNative };

export async function setKioskWindowFlags() {
  if (Platform.OS !== "android" || !Kiosk) return;
  try { await Kiosk.setKioskWindowFlags(); } catch {}
}

export async function enableKiosk() {
  if (Platform.OS !== "android" || !Kiosk) return;
  try { await Kiosk.startLockTask(); } catch {}
}

export async function disableKiosk() {
  if (Platform.OS !== "android" || !Kiosk) return;
  try { await Kiosk.stopLockTask(); } catch {}
}
