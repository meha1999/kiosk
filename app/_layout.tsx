import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as SystemUI from "expo-system-ui";
import { useKeepAwake } from "expo-keep-awake";
import { NativeModules, Alert } from "react-native";

export default function RootLayout() {
  useKeepAwake(); // extra safety: prevent sleeping

  console.log("NativeModules.Kiosk =", NativeModules.Kiosk);
  if (!NativeModules.Kiosk) {
    Alert.alert(
      "Kiosk native module is missing",
      "Ensure KioskPackage() is registered in MainApplication.kt and the plugin patch ran."
    );
  }
  
  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#000000").catch(() => {});
  }, []);

  return (
    <>
      <Slot />
      <StatusBar style="light" />
    </>
  );
}
