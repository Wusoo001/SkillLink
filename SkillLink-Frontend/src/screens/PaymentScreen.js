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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

// ===== Step indicator =====
const Stepper = ({ step, colors }) => {
  const steps = [
    { key: "idle", label: "Pay" },
    { key: "initialized", label: "Confirm" },
    { key: "completed", label: "Done" },
  ];

  const activeIndex =
    step === "completed"
      ? 2
      : step === "initialized" || step === "pending_verification"
      ? 1
      : 0;

  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const isActive = i <= activeIndex;
        const isCurrent = i === activeIndex;
        return (
          <React.Fragment key={s.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isActive ? colors.primary : colors.inputBackground,
                    borderColor: isActive ? colors.primary : colors.inputBorder,
                  },
                ]}
              >
                {i < activeIndex ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepDotText,
                      { color: isActive ? "#FFFFFF" : colors.textTertiary },
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isCurrent
                      ? colors.textPrimary
                      : isActive
                      ? colors.textSecondary
                      : colors.textTertiary,
                    fontWeight: isCurrent ? "800" : "600",
                  },
                ]}
              >
                {s.label}
              </Text>
            </View>

            {i < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor: i < activeIndex ? colors.primary : colors.inputBorder,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default function PaymentScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { bookingId, amount, serviceTitle } = route.params;

  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [step, setStep] = useState("idle");

  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  // =========================
  // INIT PAYMENT (unchanged)
  // =========================
  const initializePayment = async () => {
    try {
      setLoading(true);

      const res = await api.post("/bookings/initialize-payment", { bookingId });
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

  const animatePressIn = (scale) => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = (scale) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 24 },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: colors.card, borderColor: colors.inputBorder },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Checkout
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
              Processing transaction...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ===== HEADER ===== */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: colors.card, borderColor: colors.inputBorder },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Secure Checkout
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* ===== STEPPER ===== */}
          <Stepper step={step} colors={colors} />

          {/* ===== PAYMENT CARD ===== */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            {/* Card header */}
            <View
              style={[
                styles.cardHeader,
                { borderBottomColor: colors.inputBorder },
              ]}
            >
              <View
                style={[
                  styles.cardIconWrap,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Payment Summary
              </Text>
            </View>

            {/* Amount hero */}
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>
                Total Amount
              </Text>
              <Text
                style={[styles.amountValue, { color: colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₦{amount?.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

            {/* Service */}
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Service
              </Text>
              <Text
                style={[styles.value, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {serviceTitle}
              </Text>
            </View>

            {/* Reference (only if available) */}
            {reference && (
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textTertiary }]}>
                  Reference
                </Text>
                <View
                  style={[
                    styles.monoChip,
                    { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  ]}
                >
                  <Text
                    style={[styles.monoText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {reference}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ===== ACTION AREA ===== */}
          {step === "idle" && (
            <Animated.View style={{ transform: [{ scale: primaryScale }], width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={initializePayment}
                onPressIn={() => animatePressIn(primaryScale)}
                onPressOut={() => animatePressOut(primaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Proceed to Paystack
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </TouchableOpacity>

              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                You'll be redirected to a secure Paystack page to complete payment.
              </Text>
            </Animated.View>
          )}

          {step === "initialized" && (
            <Animated.View style={{ transform: [{ scale: secondaryScale }], width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={verifyPayment}
                onPressIn={() => animatePressIn(secondaryScale)}
                onPressOut={() => animatePressOut(secondaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Confirm Payment
                </Text>
              </TouchableOpacity>

              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                Finished paying? Tap "Confirm Payment" to verify with Paystack.
              </Text>
            </Animated.View>
          )}

          {step === "pending_verification" && (
            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: colors.warning + "18",
                  borderColor: colors.warning + "40",
                },
              ]}
            >
              <ActivityIndicator size="small" color={colors.warning} />
              <Text style={[styles.statusText, { color: colors.warning }]}>
                Verifying payment on gateway...
              </Text>
            </View>
          )}

          {step === "completed" && (
            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: colors.success + "18",
                  borderColor: colors.success + "40",
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                Payment completed successfully
              </Text>
            </View>
          )}

          {/* ===== CANCEL FOOTER ===== */}
          {step !== "completed" && step !== "pending_verification" && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
                Cancel payment
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },

  // ===== HEADER =====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    flex: 1,
  },
  placeholder: { width: 40 },

  // ===== STEPPER =====
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  stepItem: {
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "800",
  },
  stepLabel: {
    fontSize: 11.5,
    letterSpacing: 0.1,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    marginBottom: 20,
    borderRadius: 1,
  },

  // ===== CARD =====
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },

  // ===== AMOUNT HERO =====
  amountBlock: {
    alignItems: "center",
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
  },

  divider: { height: 1, marginVertical: 16 },

  // ===== DETAIL ROWS =====
  detailRow: { marginBottom: 14 },
  label: {
    fontSize: 11.5,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  value: {
    fontSize: 14.5,
    fontWeight: "500",
    lineHeight: 20,
  },
  monoChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  monoText: {
    fontSize: 12.5,
    fontFamily: "monospace",
    letterSpacing: 0.2,
  },

  // ===== BUTTONS =====
  primaryBtn: {
    flexDirection: "row",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
  helperText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
    paddingHorizontal: 8,
  },

  // ===== STATUS =====
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusText: { fontSize: 14, fontWeight: "700", letterSpacing: -0.1 },

  // ===== CANCEL =====
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});