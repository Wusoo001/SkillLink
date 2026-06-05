import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Animated,
  SafeAreaView,
} from "react-native";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentScreen({ route, navigation }) {
  const { bookingId, amount, serviceTitle } = route.params;

  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [step, setStep] = useState("idle");
  // idle → initialized → pending_verification → completed

  // Button animations
  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  // =========================
  // INIT PAYMENT (unchanged)
  // =========================
  const initializePayment = async () => {
    try {
      setLoading(true);

      const res = await api.post("/bookings/initialize-payment", {
        bookingId,
      });

      const data = res.data;

      if (!data?.authorization_url) {
        Alert.alert("Error", "Unable to initialize payment");
        return;
      }

      setPaymentUrl(data.authorization_url);
      setReference(data.reference);
      setStep("initialized");

      await Linking.openURL(data.authorization_url);
    } catch (error) {
      console.log("INIT ERROR:", error);
      Alert.alert("Error", "Payment initialization failed");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // VERIFY PAYMENT (unchanged)
  // =========================
  const verifyPayment = async () => {
    try {
      if (!reference) {
        Alert.alert("Error", "Missing payment reference");
        return;
      }

      setLoading(true);
      setStep("pending_verification");

      const res = await api.get(`/bookings/verify-payment/${reference}`);

      if (res.data?.success) {
        setStep("completed");
        Alert.alert("Success", "Payment confirmed");

        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } else {
        Alert.alert("Pending", "Payment not confirmed yet");
        setStep("initialized");
      }
    } catch (error) {
      console.log("VERIFY ERROR:", error);
      Alert.alert("Error", "Verification failed");
      setStep("initialized");
    } finally {
      setLoading(false);
    }
  };

  // Animation handlers
  const animatePressIn = (scale) => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animatePressOut = (scale) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Processing transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.title}>Secure Checkout</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Payment Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={22} color="#2563EB" />
              <Text style={styles.cardTitle}>Payment Summary</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Service</Text>
              <Text style={styles.value}>{serviceTitle}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.amountValue}>₦{amount?.toLocaleString()}</Text>
            </View>

            {reference && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Reference</Text>
                <Text style={styles.monoText}>{reference}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons – Flow Control */}
          {step === "idle" && (
            <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={initializePayment}
                onPressIn={() => animatePressIn(primaryScale)}
                onPressOut={() => animatePressOut(primaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryText}>Proceed to Paystack</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === "initialized" && (
            <Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={verifyPayment}
                onPressIn={() => animatePressIn(secondaryScale)}
                onPressOut={() => animatePressOut(secondaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="refresh-outline" size={20} color="#475569" />
                <Text style={styles.secondaryText}>Check Payment Status</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === "pending_verification" && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={styles.statusText}>Verifying payment on gateway...</Text>
            </View>
          )}

          {step === "completed" && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.successText}>Payment completed successfully</Text>
            </View>
          )}

          {/* Back Button (always visible) */}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailRow: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
  },
  monoText: {
    fontSize: 13,
    fontFamily: "monospace",
    color: "#475569",
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 16,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FEF3C7",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 15,
    color: "#D97706",
    fontWeight: "500",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F0FDF4",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  successText: {
    fontSize: 15,
    color: "#166534",
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
  },
});