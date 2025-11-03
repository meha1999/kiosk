// app/index.tsx
import { disableKiosk, enableKiosk, setKioskWindowFlags } from "@/hooks/kiosk";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AppState,
  Alert,
} from "react-native";
import { NativeModules } from "react-native";

export default function Home() {
  const [state, setState] = useState("UNKNOWN");
  const [pinningOn, setPinningOn] = useState<boolean | string>("?");

  async function refresh() {
    const { Kiosk } = NativeModules as any;
    if (!Kiosk) {
      Alert.alert(
        "No native module",
        "Run with a dev client or installed APK."
      );
      return;
    }
    setPinningOn(await Kiosk.isScreenPinningEnabled());
    setState(await Kiosk.getLockTaskState());
  }

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (s) => {
      if (s === "active") {
        try {
          await setKioskWindowFlags();
          await enableKiosk(); // will trigger dialog the first time on non-device-owner
        } catch (e: any) {
          Alert.alert("enableKiosk error", String(e?.message ?? e));
        }
        refresh();
      }
    });
    refresh();
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.c}>
      <Text style={styles.h1}>Expo Kiosk</Text>
      <Text style={styles.p}>Screen pinning enabled: {String(pinningOn)}</Text>
      <Text style={styles.p}>Lock task state: {state}</Text>

      <Pressable
        style={styles.btn}
        onPress={async () => {
          try {
            await setKioskWindowFlags();
            await enableKiosk();
          } catch (e: any) {
            Alert.alert("Re-Pin error", String(e?.message ?? e));
          }
          refresh();
        }}
      >
        <Text style={styles.btnT}>Re-Pin</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, { backgroundColor: "#444" }]}
        onPress={async () => {
          try {
            await disableKiosk();
          } catch (e: any) {
            Alert.alert("Unpin error", String(e?.message ?? e));
          }
          refresh();
        }}
      >
        <Text style={styles.btnT}>Unpin</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  h1: { color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 16 },
  p: { color: "#9aa4b2", marginBottom: 8 },
  btn: {
    backgroundColor: "#1f6feb",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 12,
  },
  btnT: { color: "#fff", fontWeight: "600" },
});
