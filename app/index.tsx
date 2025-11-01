// app/index.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";

export default function Screen() {
  const [taps, setTaps] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- reset idle timeout on any touch ---
  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      console.log("Idle timeout — exiting app");
      BackHandler.exitApp(); // auto-exit after timeout
    }, 5 * 60 * 1000); // 5 minutes
  };

  useEffect(() => {
    resetIdleTimer(); // start timer
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => {
      sub.remove();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (taps === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTaps(0), 1500);
    if (taps >= 7) {
      setTaps(0);
      setShowAdmin(true);
    }
  }, [taps]);

  const exit = () => {
    if (pin === "1234") {
      Alert.alert("Unlocked", "Exiting app…");
      BackHandler.exitApp();
    } else {
      Alert.alert("Wrong PIN");
      setPin("");
    }
  };

  // --- wrap everything in a TouchableWithoutFeedback to detect any tap ---
  return (
    <TouchableWithoutFeedback onPress={resetIdleTimer}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Kiosk</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.big}>Kiosk Mode Active</Text>
          <Text style={styles.small}>Tap top-right corner 7× for admin.</Text>
        </View>

        <TouchableOpacity
          style={styles.secret}
          onPress={() => setTaps((c) => c + 1)}
        />

        {showAdmin && (
          <View style={styles.admin}>
            <Text style={styles.adminTitle}>Admin Unlock</Text>
            <TextInput
              style={styles.input}
              placeholder="PIN"
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="numeric"
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => setShowAdmin(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.primary]}
                onPress={exit}
              >
                <Text style={styles.white}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  topBar: { height: 56, justifyContent: "center", paddingHorizontal: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  big: { color: "#fff", fontSize: 26, marginBottom: 6 },
  small: { color: "#9aa0a6" },
  secret: { position: "absolute", top: 0, right: 0, width: 90, height: 90 },
  admin: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "30%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    elevation: 6,
  },
  adminTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  primary: { backgroundColor: "#007aff" },
  white: { color: "#fff" },
});
