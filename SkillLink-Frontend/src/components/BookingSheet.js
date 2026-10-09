import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

const DATE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "flexible", label: "Flexible" },
];

export default function BookingSheet({ visible, onClose, provider, service, price, onConfirm }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState("");
  const [dateOption, setDateOption] = useState("today");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset when the sheet opens
  useEffect(() => {
    if (visible) {
      setMessage("");
      setDateOption("today");
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError("Please describe the job in at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        message: trimmed,
        scheduledDate: dateOption,
      });
    } catch (err) {
      setError(err?.message || "Failed to send request");
      setSubmitting(false);
    }
  };

  const priceNum = Number(price) || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Tap backdrop to close */}
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.inputBorder }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Provider row */}
            <View style={styles.providerRow}>
              {provider?.profileImage ? (
                <Image
                  source={{ uri: provider.profileImage }}
                  style={[styles.avatar, { borderColor: colors.inputBorder }]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                    {provider?.name?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[styles.providerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {provider?.name || "Provider"}
                </Text>
                <Text
                  style={[styles.serviceTitle, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {service || "Service"}
                </Text>
              </View>
              <View style={[styles.ratingPill, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingPillText}>
                  {Number(provider?.rating || 0).toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Price summary */}
            <View
              style={[
                styles.priceCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>
                  Service Fee
                </Text>
                <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                  ₦{priceNum.toLocaleString()}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>
                  Platform Fee
                </Text>
                <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                  ₦0
                </Text>
              </View>
              <View
                style={[styles.dashedDivider, { borderColor: colors.inputBorder }]}
              />
              <View style={styles.priceRow}>
                <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
                  Total
                </Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  ₦{priceNum.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Message */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              What do you need done? *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  borderColor: error ? colors.danger : colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={message}
              onChangeText={(t) => {
                setMessage(t);
                if (error) setError(null);
              }}
              placeholder="e.g., I need a haircut for a wedding this weekend"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={300}
              editable={!submitting}
            />
            <Text style={[styles.helper, { color: colors.textTertiary }]}>
              {message.trim().length}/300 · minimum 10 characters
            </Text>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.danger + "12",
                    borderColor: colors.danger + "40",
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* When */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>
              When?
            </Text>
            <View style={styles.dateRow}>
              {DATE_OPTIONS.map((opt) => {
                const active = dateOption === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.datePill,
                      {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.inputBorder,
                      },
                    ]}
                    onPress={() => setDateOption(opt.key)}
                    activeOpacity={0.85}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.datePillText,
                        { color: active ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Send button */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color={colors.textInverse} />
                  <Text style={[styles.sendBtnText, { color: colors.textInverse }]}>
                    Send Booking Request
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "90%",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700", fontSize: 18 },
  providerName: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2, marginBottom: 2 },
  serviceTitle: { fontSize: 13, fontWeight: "500" },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  ratingPillText: { fontSize: 12.5, fontWeight: "700", color: "#92400E" },

  priceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  priceLabel: { fontSize: 13, fontWeight: "500" },
  priceValue: { fontSize: 14, fontWeight: "600" },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  totalValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },

  label: {
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    fontWeight: "500",
  },
  helper: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 6,
    marginBottom: 12,
    textAlign: "right",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, fontWeight: "600", flex: 1 },

  dateRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  datePill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  datePillText: { fontSize: 13.5, fontWeight: "700" },

  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  sendBtnText: { fontWeight: "700", fontSize: 15.5, letterSpacing: 0.1 },

  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 13.5, fontWeight: "600" },
});