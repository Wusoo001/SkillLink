import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { createCircleRequest } from "../services/api";

const CATEGORIES = [
  "Plumber",
  "Electrician",
  "Mechanic",
  "Carpenter",
  "Painter",
  "Cleaner",
  "Tailor",
  "Caterer",
  "Makeup Artist",
  "Hair Stylist",
  "Photographer",
  "Designer",
  "Developer",
  "Tutor",
  "Mover",
  "Other",
];

export default function CreateRequestScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { circleId, circleName } = route.params || {};

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (title.trim().length < 10) {
      setError("Title must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createCircleRequest(circleId, {
        category,
        title: title.trim(),
        description: description.trim(),
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Ask {circleName || "your circle"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          What type of service?
        </Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: category === c ? colors.primary : colors.card,
                  borderColor: category === c ? colors.primary : colors.inputBorder,
                },
              ]}
              onPress={() => setCategory(c)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: category === c ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 22 }]}>
          What do you need? <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary },
          ]}
          placeholder="e.g., Anyone know a reliable plumber in Ikeja?"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (error) setError("");
          }}
          maxLength={100}
        />
        <Text style={[styles.helper, { color: colors.textTertiary }]}>
          {title.length}/100 · minimum 10 characters
        </Text>

        {/* Description */}
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
          Details (optional)
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary },
          ]}
          placeholder="Add context — what needs fixing, when, budget..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          numberOfLines={4}
        />
        <Text style={[styles.helper, { color: colors.textTertiary }]}>
          {description.length}/500
        </Text>

        {error ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.danger + "12", borderColor: colors.danger + "40" },
            ]}
          >
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color={colors.textInverse} />
              <Text style={[styles.submitText, { color: colors.textInverse }]}>
                Post to Circle
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
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
  headerTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  scroll: { paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "500",
    borderWidth: 1,
    minHeight: 48,
  },
  textArea: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: "top",
  },
  helper: { fontSize: 11, fontWeight: "500", marginTop: 6, textAlign: "right" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  errorText: { fontSize: 12.5, fontWeight: "600", flex: 1 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
    marginTop: 22,
  },
  submitText: { fontSize: 15, fontWeight: "700" },
});