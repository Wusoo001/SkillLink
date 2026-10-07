import React, { useContext, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { deleteAccount } from "../services/api";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const [deleting, setDeleting] = useState(false);

const handleDeleteAccount = async () => {
  // Confirm step 1
  const confirmed =
  Platform.OS === "web"
      ? window.confirm(
          "This will permanently delete your account, posts, wallet, and reviews. This action cannot be undone.\n\nAre you absolutely sure?"
        )
      : await new Promise((resolve) => {
          Alert.alert(
            "Delete Account",
            "This will permanently delete your account, posts, wallet, and reviews. This action cannot be undone.\n\nAre you absolutely sure?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              {
                text: "Delete Forever",
                style: "destructive",
                onPress: () => resolve(true),
              },
            ]
          );
        });

  if (!confirmed) return;

  setDeleting(true);
  try {
    await deleteAccount();

    // Success step
    if (Platform.OS === "web") {
      window.alert("Your account has been permanently deleted.");
      logout();
    } else {
      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted.",
        [{ text: "OK", onPress: () => logout() }]
      );
    }
  } catch (error) {
    const msg =
      error.response?.data?.message || "Could not delete account. Try again.";
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Error", msg);
    }
  } finally {
    setDeleting(false);
  }
};;

  const Row = ({ icon, label, onPress, danger = false, loading = false }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.inputBorder }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={loading}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.danger : colors.textPrimary}
        />
        <Text
          style={[
            styles.rowLabel,
            { color: danger ? colors.danger : colors.textPrimary },
          ]}
        >
          {label}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Legal */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          LEGAL
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Row
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => navigation.navigate("PrivacyPolicy")}
          />
          <Row
            icon="document-text-outline"
            label="Terms & Conditions"
            onPress={() => navigation.navigate("Terms")}
          />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          DANGER ZONE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Row
            icon="trash-outline"
            label={deleting ? "Deleting..." : "Delete Account"}
            onPress={handleDeleteAccount}
            danger
            loading={deleting}
          />
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Street v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, flex: 1 },
  content: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
  footer: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 20,
  },
});