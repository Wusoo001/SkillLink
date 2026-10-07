import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { submitReport } from "../services/api";

const REASONS = [
  { key: "spam", label: "Spam or repetitive content" },
  { key: "harassment", label: "Harassment or abuse" },
  { key: "fake_account", label: "Fake account" },
  { key: "inappropriate_content", label: "Inappropriate content" },
  { key: "scam", label: "Scam or fraud" },
  { key: "off_platform_deal", label: "Trying to deal outside the app" },
  { key: "other", label: "Other" },
];

export default function ReportModal({ visible, onClose, type, targetId }) {
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
  if (!selectedReason) {
    if (Platform.OS === "web") {
      window.alert("Please choose why you're reporting this.");
    } else {
      Alert.alert("Select a reason", "Please choose why you're reporting this.");
    }
    return;
  }

  setSubmitting(true);
  try {
    const payload = {
      type,
      reason: selectedReason,
      description: description.trim(),
    };
    if (type === "user") payload.reportedUserId = targetId;
    if (type === "post") payload.reportedPostId = targetId;

    const res = await submitReport(payload);

    if (res.success) {
      if (Platform.OS === "web") {
        window.alert(res.message);
      } else {
        Alert.alert("Report Submitted", res.message);
      }
      setSelectedReason(null);
      setDescription("");
      onClose();
    } else {
      const msg = res.message || "Failed to submit report";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  } catch (error) {
    const msg = error.response?.data?.message || "Network error";
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert("Error", msg);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.inputBorder }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Report {type === "user" ? "User" : "Post"}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              Why are you reporting this?
            </Text>

            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.key}
                style={[
                  styles.reasonRow,
                  { borderColor: colors.inputBorder },
                  selectedReason === reason.key && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                ]}
                onPress={() => setSelectedReason(reason.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.reasonLabel,
                    {
                      color:
                        selectedReason === reason.key
                          ? colors.primary
                          : colors.textPrimary,
                      fontWeight: selectedReason === reason.key ? "700" : "500",
                    },
                  ]}
                >
                  {reason.label}
                </Text>
                {selectedReason === reason.key && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={[styles.subtitle, { color: colors.textTertiary, marginTop: 16 }]}>
              Additional details (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what happened..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.danger,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5, fontWeight: "600", marginBottom: 10, letterSpacing: 0.1 },
  reasonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonLabel: { fontSize: 14.5, flex: 1 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15.5 },
});