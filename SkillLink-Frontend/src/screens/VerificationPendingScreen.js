import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { resendVerificationEmail } from "../services/api";

const RESEND_COOLDOWN_SECONDS = 60;

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

export default function VerificationPendingScreen({ navigation, route }) {
  const { email } = route.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [lastSentAt, setLastSentAt] = useState(null);

  // Cooldown tick
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  const handleResend = async () => {
    if (!email) {
      webAlert("Missing email", "Please go back and register again.");
      return;
    }
    if (loading || cooldownLeft > 0) return;

    setLoading(true);
    try {
      const res = await resendVerificationEmail(email);
      if (res.success) {
        setCooldownLeft(RESEND_COOLDOWN_SECONDS);
        setLastSentAt(new Date());
        webAlert(
          "Email Sent",
          "Check your inbox (and spam folder) for the verification link."
        );
      } else {
        webAlert("Couldn't Send", res.message || "Please try again.");
      }
    } catch (error) {
      webAlert(
        "Network Error",
        error?.response?.data?.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigation.replace("Landing");
  };

  // ===== MISSING EMAIL FALLBACK =====
  if (!email) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.warning + "20" },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={colors.warning}
              />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Missing Email
          </Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            Please go back and register again to receive a verification link.
          </Text>
          <TouchableOpacity
            style={[
              styles.resendButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={handleGoToLogin}
            activeOpacity={0.9}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={colors.textInverse}
            />
            <Text style={[styles.resendText, { color: colors.textInverse }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* ICON */}
        <View style={styles.iconWrap}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons
              name="mail-unread-outline"
              size={40}
              color={colors.primary}
            />
          </View>
        </View>

        {/* TITLE */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Check Your Email
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          We've sent a verification link to
        </Text>

        {/* EMAIL CHIP */}
        <View
          style={[
            styles.emailChip,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Ionicons
            name="at-outline"
            size={15}
            color={colors.textTertiary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[styles.email, { color: colors.textPrimary }]}
            numberOfLines={1}
            selectable
          >
            {email}
          </Text>
        </View>

        {/* INSTRUCTION */}
        <Text style={[styles.instruction, { color: colors.textTertiary }]}>
          Tap the link in the email to verify your account. If you don't see it,
          check your spam folder.
        </Text>

        {/* PRIMARY: LOGIN */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
          ]}
          onPress={handleGoToLogin}
          activeOpacity={0.9}
        >
          <Ionicons name="log-in-outline" size={18} color={colors.textInverse} />
          <Text style={[styles.resendText, { color: colors.textInverse }]}>
            I've Verified — Go to Login
          </Text>
        </TouchableOpacity>

        {/* SECONDARY: RESEND */}
        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.inputBorder,
              opacity: loading || cooldownLeft > 0 ? 0.6 : 1,
            },
          ]}
          onPress={handleResend}
          disabled={loading || cooldownLeft > 0}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Ionicons
                name="refresh-outline"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.secondaryBtnText, { color: colors.primary }]}
              >
                {cooldownLeft > 0
                  ? `Resend in ${cooldownLeft}s`
                  : "Resend Verification Email"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {lastSentAt && (
          <Text style={[styles.metaHint, { color: colors.textTertiary }]}>
            Last sent:{" "}
            {lastSentAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}

        {/* FOOTER */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={handleGoToLogin}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginText, { color: colors.textTertiary }]}>
            Already verified?{" "}
            <Text style={[styles.loginHighlight, { color: colors.primary }]}>
              Login
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  iconWrap: { alignItems: "center", marginBottom: 22 },
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
    letterSpacing: 0.1,
  },

  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    maxWidth: "100%",
  },
  email: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.1,
    maxWidth: 240,
  },

  instruction: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 19,
    paddingHorizontal: 8,
    fontWeight: "500",
  },

  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
    width: "100%",
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  resendText: { fontWeight: "700", fontSize: 15.5, letterSpacing: 0.1 },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    width: "100%",
    borderWidth: 1,
    marginBottom: 8,
  },
  secondaryBtnText: { fontWeight: "600", fontSize: 14 },

  metaHint: {
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },

  loginLink: { paddingVertical: 8, marginTop: 8 },
  loginText: { fontSize: 13.5, fontWeight: "500", textAlign: "center" },
  loginHighlight: { fontWeight: "800" },
});