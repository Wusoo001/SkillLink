import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { api } from "../services/api";

export default function PaymentScreen({ route, navigation }) {
  const { bookingId, amount, serviceTitle } = route.params;

  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [step, setStep] = useState("idle"); 
  // idle → initialized → pending_verification → completed
  // =========================
  // INIT PAYMENT
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

      // open Paystack checkout
      await Linking.openURL(data.authorization_url);
    } catch (error) {
      console.log("INIT ERROR:", error);
      Alert.alert("Error", "Payment initialization failed");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // VERIFY PAYMENT (BACKEND AUTHORITY)
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

  // =========================
  // UI STATE
  // =========================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Processing transaction...</Text>
      </View>
    );
  }
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Checkout</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Service</Text>
        <Text style={styles.value}>{serviceTitle}</Text>

        <Text style={styles.label}>Amount</Text>
        <Text style={styles.value}>₦{amount}</Text>

        {reference && (
          <>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.mono}>{reference}</Text>
          </>
        )}
      </View>

      {/* =========================
          SINGLE FLOW CONTROL
      ========================= */}

      {step === "idle" && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={initializePayment}
        >
          <Text style={styles.primaryText}>Proceed to Paystack</Text>
        </TouchableOpacity>
      )}

      {step === "initialized" && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={verifyPayment}
        >
          <Text style={styles.secondaryText}>Check Payment Status</Text>
        </TouchableOpacity>
      )}

      {step === "pending_verification" && (
        <View style={styles.statusBox}>
          <Text>Verifying payment on blockchain gateway...</Text>
        </View>
      )}

      {step === "completed" && (
        <View style={styles.successBox}>
          <Text>Payment completed successfully</Text>
        </View>
      )}

      {/* BACK NAV (ALWAYS AVAILABLE) */}
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F6FA",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },

  subText: {
    marginTop: 10,
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 10,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  mono: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#374151",
  },

  primaryBtn: {
    backgroundColor: "#0A66FF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },

  secondaryBtn: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },

  secondaryText: {
    fontWeight: "600",
    color: "#111827",
  },

  cancelBtn: {
    padding: 10,
    alignItems: "center",
  },

  cancelText: {
    color: "#6B7280",
  },
});