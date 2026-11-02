import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

// Read a query param from the browser URL (web only)
const getQueryParam = (name) => {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
};

export default function PaymentReturnScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userToken } = useContext(AuthContext);

  // ref comes from route params (deep link) OR from window.location.search (web)
  const ref =
    route.params?.ref ||
    getQueryParam("ref") ||
    getQueryParam("reference");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBooking();
  }, []);

  const fetchBooking = async () => {
    if (!ref) {
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
      const res = await api.get(`/bookings/by-escrow-id/${ref}`);
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load booking.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!booking) return;
    setChecking(true);
    try {
      const res = await api.get(`/bookings/by-escrow-id/${ref}`);
      const updated = res.data.data;
      setBooking(updated);

      if (
        updated.status === "paid_in_escrow" ||
        updated.status === "released"
      ) {
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
        }, 1200);
      } else {
        setError("Payment not yet confirmed. Wait a few seconds and try again.");
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify payment.");
    } finally {
      setChecking(false);
    }
  };

  // Auto-redirect when booking is confirmed
  useEffect(() => {
    if (
      booking &&
      (booking.status === "paid_in_escrow" || booking.status === "released")
    ) {
      const timer = setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [booking]);

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

  if (error && !booking) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: colors.danger + "18" }]}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Payment Issue</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{error}</Text>
          {/* ✅ FIX: route to Landing if not logged in, MainTabs otherwise */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (!userToken) {
                navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
              } else {
                navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
              }
            }}
            activeOpacity={0.9}
          >
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              {!userToken ? "Sign In" : "Go to Dashboard"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isConfirmed =
    booking?.status === "paid_in_escrow" || booking?.status === "released";

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
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
            : "We're checking with the payment gateway. This usually takes a few seconds."}
        </Text>

        {booking && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>Service</Text>
              <Text style={[styles.rowValue, { color: colors.textPrimary }]} numberOfLines={2}>
                {booking.serviceTitle}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>Amount</Text>
              <Text style={[styles.rowValue, { color: colors.primary, fontWeight: "800" }]}>
                ₦{booking.price?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>Status</Text>
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
        )}

        {error && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.danger + "10", borderColor: colors.danger + "40" },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {!isConfirmed && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: checking ? 0.6 : 1 }]}
            onPress={handleConfirm}
            disabled={checking}
            activeOpacity={0.9}
          >
            {checking ? (
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
        )}

        {isConfirmed && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.success }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
            activeOpacity={0.9}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} />
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              Go to Dashboard
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
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
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 24, fontWeight: "800", letterSpacing: -0.5,
    textAlign: "center", marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, fontWeight: "500", textAlign: "center",
    marginBottom: 24, lineHeight: 20, paddingHorizontal: 8,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", paddingVertical: 8, gap: 12,
  },
  rowLabel: {
    fontSize: 12.5, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.3, minWidth: 70,
  },
  rowValue: { fontSize: 14.5, fontWeight: "600", flex: 1, textAlign: "right" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  errorText: { fontSize: 12.5, fontWeight: "600", flex: 1 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 54, borderRadius: 14, width: "100%", marginBottom: 12,
  },
  primaryText: { fontWeight: "700", fontSize: 15.5 },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 13, fontWeight: "600" },
});