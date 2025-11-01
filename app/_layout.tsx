import { Slot } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { setStatusBarHidden } from "expo-status-bar";
import {
  activateKeepAwakeAsync,
} from "expo-keep-awake";

export default function RootLayout() {
  useEffect(() => {
    setStatusBarHidden(true, "none");
    activateKeepAwakeAsync();

    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => {
      sub.remove();
      setStatusBarHidden(false, "fade");
    };
  }, []);

  return <Slot />;
}
