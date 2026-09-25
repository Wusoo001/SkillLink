import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { resendVerificationEmail } from "../services/api";

export default function VerificationPendingScreen({ navigation, route }) {
  const { email } = route.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      Alert.alert("Error", "No email provided");
      return;
    }
    setLoading(true);
    try {
      const res = await resendVerificationEmail(email);
      if (res.success) {
        Alert.alert("Success", "Verification email sent. Check your inbox.");
      } else {
        Alert.alert("Error", res.message || "Failed to resend.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        {/* ===== ICON ===== */}
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons name="mail-unread-outline" size={40} color={colors.primary} />
          </View>
        </View>

        {/* ===== TITLE ===== */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Check Your Email
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          We've sent a verification link to
        </Text>

        {/* ===== EMAIL CHIP ===== */}
        <View
          style={[
            styles.emailChip,
            {
              backgroundColor: colors.card,
              borderColor: colors.inputBorder,
            },
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
          >
            {email || "your email"}
          </Text>
        </View>

        {/* ===== INSTRUCTION ===== */}
        <Text style={[styles.instruction, { color: colors.textTertiary }]}>
          Tap the link in the email to verify your account. If you don't see
          it, check your spam folder.
        </Text>

        {/* ===== RESEND CTA ===== */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleResend}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.textInverse}
              />
              <Text style={[styles.resendText, { color: colors.textInverse }]}>
                Resend Verification Email
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ===== LOGIN LINK ===== */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.replace("Landing")}
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

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // ===== ICON =====
  iconWrap: {
    alignItems: "center",
    marginBottom: 22,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  // ===== TITLE =====
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

  // ===== EMAIL CHIP =====
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

  // ===== INSTRUCTION =====
  instruction: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 19,
    paddingHorizontal: 8,
    fontWeight: "500",
  },

  // ===== RESEND CTA =====
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
    width: "100%",
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  resendText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },

  // ===== LOGIN LINK =====
  loginLink: {
    paddingVertical: 8,
  },
  loginText: {
    fontSize: 13.5,
    fontWeight: "500",
    textAlign: "center",
  },
  loginHighlight: {
    fontWeight: "800",
  },
});