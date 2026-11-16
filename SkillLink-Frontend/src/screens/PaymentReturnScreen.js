import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10; // 30s total auto-poll
const SUCCESS_REDIRECT_DELAY_MS = 1500;

const getQueryParam = (name) => {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
};

const isPaidStatus = (status) =>
  status === "paid_in_escrow" ||
  status === "released" ||
  status === "completed";

export default function PaymentReturnScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userToken } = useContext(AuthContext);

  // escrowId (called "ref" in URL) — this is the Pandascrow escrow_id, not a payment reference
  const escrowId =
    (route.params?.ref && String(route.params.ref).trim()) ||
    getQueryParam("ref") ||
    getQueryParam("reference") ||
    null;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const pollTimerRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const navigationDoneRef = useRef(false);

  // Clean up timers + prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // Safe one-shot navigation
  const safeNavigateToMain = useCallback(() => {
    if (navigationDoneRef.current) return;
    navigationDoneRef.current = true;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    if (isMountedRef.current) {
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    }
  }, [navigation]);

  // Fetch once
  const fetchBooking = useCallback(async () => {
    if (!escrowId) {
      setError("No payment reference found in URL.");
      setLoading(false);
      return;
    }
    if (!userToken) {
      setError("Please sign in to view this payment.");
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/bookings/by-escrow-id/${escrowId}`);
      if (!isMountedRef.current) return;
      setBooking(res.data.data);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err.response?.data?.message ||
          "Could not load booking. Please try again."
      );
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [escrowId, userToken]);

  // Auto-poll while status isn't confirmed
  const startPolling = useCallback(
    (attempt = 0) => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (attempt >= MAX_POLL_ATTEMPTS) return;

      pollTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;
        try {
          const res = await api.get(`/bookings/by-escrow-id/${escrowId}`);
          if (!isMountedRef.current) return;
          const updated = res.data?.data;
          if (updated) {
            setBooking(updated);
            setPollCount(attempt + 1);
            if (isPaidStatus(updated.status)) {
              // Stop polling — let the success useEffect handle redirect
              return;
            }
          }
          startPolling(attempt + 1);
        } catch (err) {
          // Silent — keep polling until max attempts
          if (isMountedRef.current) {
            setPollCount(attempt + 1);
            startPolling(attempt + 1);
          }
        }
      }, POLL_INTERVAL_MS);
    },
    [escrowId]
  );

  // Initial fetch → if pending, start auto-polling
  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  useEffect(() => {
    if (!booking) return;
    if (isPaidStatus(booking.status)) return; // Already confirmed
    if (error) return; // Stop polling if we already errored
    // Start polling if not already done
    if (pollCount === 0) {
      startPolling(0);
    }
  }, [booking, error, pollCount, startPolling]);

  // Auto-redirect when confirmed
  useEffect(() => {
    if (
      booking &&
      isPaidStatus(booking.status) &&
      !navigationDoneRef.current
    ) {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      redirectTimerRef.current = setTimeout(() => {
        safeNavigateToMain();
      }, SUCCESS_REDIRECT_DELAY_MS);
      return () => {
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      };
    }
  }, [booking, safeNavigateToMain]);

  // Manual re-check
  const handleConfirm = async () => {
    if (!booking || checking) return;
    setChecking(true);
    try {
      const res = await api.get(`/bookings/by-escrow-id/${escrowId}`);
      if (!isMountedRef.current) return;
      const updated = res.data.data;
      setBooking(updated);

      if (isPaidStatus(updated.status)) {
        // Success useEffect will handle redirect
        setError(null);
      } else {
        setError(
          "Payment not yet confirmed. Wait a few seconds and try again."
        );
        setTimeout(() => {
          if (isMountedRef.current) setError(null);
        }, 4000);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err.response?.data?.message || "Could not verify payment."
      );
    } finally {
      if (isMountedRef.current) setChecking(false);
    }
  };

  const handleManualRefresh = () => {
    if (checking) return;
    setError(null);
    setPollCount(0);
    setLoading(true);
    fetchBooking();
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Loading payment details...
          </Text>
        </View>
      </View>
    );
  }

  // ===== ERROR WITHOUT BOOKING =====
  if (error && !booking) {
    return (
      <View
        style={[
          styles.safeArea,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.danger + "18" },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={colors.danger}
              />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Payment Issue
          </Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {error}
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleManualRefresh}
            activeOpacity={0.9}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.textInverse} />
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              Try Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              if (!userToken) {
                navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
              } else {
                safeNavigateToMain();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
              {!userToken ? "Sign In" : "Back to Dashboard"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isConfirmed = isPaidStatus(booking?.status);
  const isAutoPolling = !isConfirmed && pollCount > 0 && pollCount < MAX_POLL_ATTEMPTS;
  const pollingExhausted = !isConfirmed && pollCount >= MAX_POLL_ATTEMPTS;
  const safePrice = Number(booking?.price) || 0;

  return (
    <View
      style={[
        styles.safeArea,
        { backgroundColor: colors.background, paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isConfirmed
                  ? colors.success + "18"
                  : colors.warning + "18",
              },
            ]}
          >
            <Ionicons
              name={isConfirmed ? "checkmark-circle-outline" : "time-outline"}
              size={40}
              color={isConfirmed ? colors.success : colors.warning}
            />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isConfirmed ? "Payment Confirmed" : "Verifying Payment"}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          {isConfirmed
            ? "Your payment has been received and is safely held in escrow."
            : isAutoPolling
            ? "Checking with the payment gateway automatically. This usually takes a few seconds."
            : pollingExhausted
            ? "Payment not confirmed yet. If you just paid, wait a moment and try again."
            : "We're checking with the payment gateway."}
        </Text>

        {isAutoPolling ? (
          <View
            style={[
              styles.pollingBox,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary + "40",
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.pollingText, { color: colors.primary }]}>
              Auto-checking ({pollCount}/{MAX_POLL_ATTEMPTS})
            </Text>
          </View>
        ) : null}

        {booking ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
                Service
              </Text>
              <Text
                style={[styles.rowValue, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {booking.serviceTitle || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
                Amount
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: colors.primary, fontWeight: "800" },
                ]}
              >
                ₦{safePrice.toLocaleString()}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
                Status
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: isConfirmed ? colors.success : colors.warning },
                ]}
              >
                {isConfirmed ? "Escrow Funded" : "Awaiting Confirmation"}
              </Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.danger + "10",
                borderColor: colors.danger + "40",
              },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {!isConfirmed ? (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: checking ? 0.6 : 1 },
            ]}
            onPress={handleConfirm}
            disabled={checking}
            activeOpacity={0.9}
          >
            {checking ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <>
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.textInverse}
                />
                <Text
                  style={[styles.primaryText, { color: colors.textInverse }]}
                >
                  Check Again Now
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.success }]}
            onPress={safeNavigateToMain}
            activeOpacity={0.9}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={colors.textInverse}
            />
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              Go to Dashboard
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={safeNavigateToMain}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },

  iconWrap: { alignItems: "center", marginBottom: 20 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  pollingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignSelf: "center",
  },
  pollingText: { fontSize: 12.5, fontWeight: "600" },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 12,
  },
  rowLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    minWidth: 70,
  },
  rowValue: { fontSize: 14.5, fontWeight: "600", flex: 1, textAlign: "right" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 12.5, fontWeight: "600", flex: 1 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
    width: "100%",
    marginBottom: 12,
  },
  primaryText: { fontWeight: "700", fontSize: 15.5 },

  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 13, fontWeight: "600" },
});