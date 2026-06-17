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
import { useTheme } from "../context/ThemeContext";

export default function PaymentScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { bookingId, amount, serviceTitle } = route.params;

  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [step, setStep] = useState("idle");

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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Processing transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: colors.card,
                  shadowColor: colors.shadowColor,
                  shadowOpacity: colors.shadowOpacity,
                },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Secure Checkout</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Payment Details Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadowColor,
                shadowOpacity: colors.shadowOpacity,
              },
            ]}
          >
            <View style={[styles.cardHeader, { borderBottomColor: colors.cardBorder }]}>
              <Ionicons name="receipt-outline" size={22} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Payment Summary</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Service</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{serviceTitle}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Amount</Text>
              <Text style={[styles.amountValue, { color: colors.primary }]}>₦{amount?.toLocaleString()}</Text>
            </View>

            {reference && (
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textTertiary }]}>Reference</Text>
                <Text style={[styles.monoText, { color: colors.textTertiary, backgroundColor: colors.inputBackground }]}>
                  {reference}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons – Flow Control */}
          {step === "idle" && (
            <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOpacity: 0.2,
                  },
                ]}
                onPress={initializePayment}
                onPressIn={() => animatePressIn(primaryScale)}
                onPressOut={() => animatePressOut(primaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="lock-closed-outline" size={20} color={colors.textInverse} />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>Proceed to Paystack</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === "initialized" && (
            <Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.gray,
                    borderColor: colors.inputBorder,
                  },
                ]}
                onPress={verifyPayment}
                onPressIn={() => animatePressIn(secondaryScale)}
                onPressOut={() => animatePressOut(secondaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>Check Payment Status</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === "pending_verification" && (
            <View style={[styles.statusBox, { backgroundColor: colors.warning + "20" }]}>
              <ActivityIndicator size="small" color={colors.warning} />
              <Text style={[styles.statusText, { color: colors.warning }]}>Verifying payment on gateway...</Text>
            </View>
          )}

          {step === "completed" && (
            <View style={[styles.successBox, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Payment completed successfully</Text>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
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
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  placeholder: { width: 40 },
  card: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
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
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  detailRow: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  value: { fontSize: 16, fontWeight: "600" },
  amountValue: { fontSize: 22, fontWeight: "800" },
  monoText: {
    fontSize: 13,
    fontFamily: "monospace",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  primaryBtn: {
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: { fontWeight: "700", fontSize: 17, letterSpacing: 0.3 },
  secondaryBtn: {
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  secondaryText: { fontWeight: "600", fontSize: 16 },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: { fontSize: 15, fontWeight: "500" },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  successText: { fontSize: 15, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontWeight: "600", fontSize: 15 },
});