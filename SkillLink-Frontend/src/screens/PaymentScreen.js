import React, { useState, useRef, useEffect, useCallback } from "react";
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
  AppState,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, getBookingById } from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

const refKeyFor = (bookingId) => `paymentRef_${bookingId}`;

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
  const { bookingId, amount, serviceTitle } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [reference, setReference] = useState(null);
  const [step, setStep] = useState("idle");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [initError, setInitError] = useState(false);

  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;
  const verifyingRef = useRef(false);

  // =========================
  // MOUNT — check booking state + restore pending reference
  // =========================
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!bookingId) {
        setInitError(true);
        setInitializing(false);
        return;
      }

      // 1. If already paid → jump to completed
      try {
        const res = await getBookingById(bookingId);
        if (cancelled) return;
        const s = res?.data?.status;
        if (s === "paid_in_escrow" || s === "released" || s === "completed") {
          setStep("completed");
          setAlreadyPaid(true);
          setInitializing(false);
          return;
        }
      } catch (e) {
        // Non-fatal — proceed to idle
      }

      // 2. Restore any pending reference from a previous session
      try {
        const saved = await AsyncStorage.getItem(refKeyFor(bookingId));
        if (!cancelled && saved) {
          setReference(saved);
          setStep("initialized");
        }
      } catch (e) {}

      if (!cancelled) setInitializing(false);
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // =========================
  // AUTO-VERIFY when app returns to foreground
  // =========================
  useEffect(() => {
    if (!reference) return;
    if (step !== "initialized") return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && reference && !verifyingRef.current) {
        verifyPayment({ silent: true });
      }
    });

    return () => sub.remove();
  }, [reference, step]);

  // =========================
  // INIT PAYMENT
  // =========================
  const initializePayment = async () => {
    if (!bookingId) {
      webAlert("Error", "Missing booking information.");
      return;
    }
    try {
      setLoading(true);

      const res = await api.post("/bookings/initialize-payment", { bookingId });
      const data = res.data;

      if (!data?.checkout_url) {
        webAlert("Error", "Unable to initialize payment");
        return;
      }

      setReference(data.reference);
      setStep("initialized");

      try {
        await AsyncStorage.setItem(refKeyFor(bookingId), data.reference);
      } catch (e) {}

      await Linking.openURL(data.checkout_url);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Unknown error";
      webAlert("Payment Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // VERIFY PAYMENT
  // =========================
  const verifyPayment = useCallback(async ({ silent = false } = {}) => {
    if (!reference) {
      if (!silent) webAlert("Error", "Missing payment reference");
      return;
    }
    if (verifyingRef.current) return;

    verifyingRef.current = true;
    if (!silent) {
      setLoading(true);
      setStep("pending_verification");
    }

    try {
      const res = await api.get(`/bookings/by-reference/${reference}`);
      const status = res.data?.data?.status;

      if (status === "paid_in_escrow" || status === "released" || status === "completed") {
        setStep("completed");
        try {
          await AsyncStorage.removeItem(refKeyFor(bookingId));
        } catch (e) {}
        if (!silent) {
          webAlert("Success", "Payment confirmed");
        }
        return;
      }

      if (!silent) {
        webAlert(
          "Pending",
          "Payment not confirmed yet. If you just paid, please wait a few seconds and try again."
        );
        setStep("initialized");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Verification failed";
      if (!silent) {
        webAlert("Error", msg);
        setStep("initialized");
      }
    } finally {
      verifyingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [reference, bookingId]);

  const handleManualVerify = () => verifyPayment({ silent: false });

  const animatePressIn = (scale) => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = (scale) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleCancelPayment = () => {
    // Warn differently based on state
    if (step === "initialized") {
      const msg =
        "You've already started payment. If you close now, you can still confirm payment later from this booking. Continue?";
      if (Platform.OS === "web") {
        if (window.confirm(msg)) navigation.goBack();
      } else {
        Alert.alert("Cancel Payment", msg, [
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => navigation.goBack() },
        ]);
      }
    } else {
      navigation.goBack();
    }
  };

  // ===== INITIALIZING STATE =====
  if (initializing) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
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
          </View>
        </View>
      </View>
    );
  }

  // ===== ERROR STATE (missing booking) =====
  if (initError) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={[styles.errorIconWrap, { backgroundColor: colors.danger + "15" }]}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
              Missing booking information
            </Text>
            <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
              We couldn't load this payment. Please go back and try again.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textInverse} />
              <Text style={[styles.retryBtnText, { color: colors.textInverse }]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ===== LOADING STATE (fullscreen, only during blocking init/verify) =====
  if (loading && step === "pending_verification") {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
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
              Verifying payment...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const safeAmount = Number(amount);
  const displayAmount = isNaN(safeAmount) ? 0 : safeAmount;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* HEADER */}
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

          <Stepper step={step} colors={colors} />

          {/* PAYMENT CARD */}
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
            <View style={[styles.cardHeader, { borderBottomColor: colors.inputBorder }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Payment Summary
              </Text>
            </View>

            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>
                Total Amount
              </Text>
              <Text
                style={[styles.amountValue, { color: colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₦{displayAmount.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Service</Text>
              <Text
                style={[styles.value, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {serviceTitle || "Booking"}
              </Text>
            </View>

            {reference && (
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textTertiary }]}>
                  Reference
                </Text>
                <View
                  style={[
                    styles.monoChip,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                    },
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

          {/* ACTION AREA */}
          {step === "idle" && (
            <Animated.View style={{ transform: [{ scale: primaryScale }], width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={initializePayment}
                onPressIn={() => animatePressIn(primaryScale)}
                onPressOut={() => animatePressOut(primaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Proceed to Payment
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </TouchableOpacity>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                You'll be redirected to a secure payment page to complete payment.
              </Text>
            </Animated.View>
          )}

          {step === "initialized" && (
            <Animated.View style={{ transform: [{ scale: secondaryScale }], width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={handleManualVerify}
                disabled={loading}
                onPressIn={() => animatePressIn(secondaryScale)}
                onPressOut={() => animatePressOut(secondaryScale)}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={colors.textInverse} />
                    <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                      Confirm Payment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                Finished paying? Tap "Confirm Payment" to verify. We also check
                automatically when you return to the app.
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
            <>
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

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Ionicons name="arrow-back" size={18} color={colors.textInverse} />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Back to Booking
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* CANCEL FOOTER */}
          {step !== "completed" && step !== "pending_verification" && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelPayment}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  errorSub: { fontSize: 13.5, textAlign: "center", lineHeight: 19, marginBottom: 24 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20, gap: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20, fontWeight: "800", letterSpacing: -0.4, flex: 1,
  },
  placeholder: { width: 40 },

  stepper: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20, paddingHorizontal: 6,
  },
  stepItem: { alignItems: "center", gap: 6 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  stepDotText: { fontSize: 12, fontWeight: "800" },
  stepLabel: { fontSize: 11.5, letterSpacing: 0.1 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 6, marginBottom: 20, borderRadius: 1 },

  card: {
    borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04,
    shadowRadius: 12, elevation: 2,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  cardIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },

  amountBlock: { alignItems: "center", paddingVertical: 8 },
  amountLabel: {
    fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6,
    textTransform: "uppercase", marginBottom: 6,
  },
  amountValue: { fontSize: 34, fontWeight: "800", letterSpacing: -1, textAlign: "center" },
  divider: { height: 1, marginVertical: 16 },

  detailRow: { marginBottom: 14 },
  label: {
    fontSize: 11.5, fontWeight: "600", letterSpacing: 0.3,
    textTransform: "uppercase", marginBottom: 5,
  },
  value: { fontSize: 14.5, fontWeight: "500", lineHeight: 20 },
  monoChip: {
    borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12,
    alignSelf: "flex-start", maxWidth: "100%",
  },
  monoText: { fontSize: 12.5, fontFamily: "monospace", letterSpacing: 0.2 },

  primaryBtn: {
    flexDirection: "row", height: 54, borderRadius: 14, alignItems: "center",
    justifyContent: "center", gap: 8, width: "100%",
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22,
    shadowRadius: 12, elevation: 4,
  },
  primaryText: { fontWeight: "700", fontSize: 15.5, letterSpacing: 0.1 },
  helperText: {
    fontSize: 12, fontWeight: "500", textAlign: "center",
    marginTop: 12, lineHeight: 16, paddingHorizontal: 8,
  },

  statusBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 1, marginBottom: 12,
  },
  statusText: { fontSize: 14, fontWeight: "700", letterSpacing: -0.1 },

  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 13, fontWeight: "600", letterSpacing: 0.1 },
});