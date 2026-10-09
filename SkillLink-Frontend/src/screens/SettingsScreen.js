import React, { useContext, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { requestAccountDeletion, cancelAccountDeletion } from "../services/api";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useContext(AuthContext);

  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isPendingDeletion = !!user?.scheduledDeletionAt;

  // ===== STEP 1: Confirm deletion =====
  const handleDeleteAccount = () => {
    const message =
      "Your account will be scheduled for deletion in 7 days. During this period, you can log back in anytime to cancel.\n\nAfter 7 days, all your data will be permanently removed.\n\nAre you sure you want to continue?";

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        setPassword("");
        setPasswordModalVisible(true);
      }
      return;
    }

    Alert.alert("Delete Account?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        style: "destructive",
        onPress: () => {
          setPassword("");
          setPasswordModalVisible(true);
        },
      },
    ]);
  };

  // ===== STEP 2: Submit with password =====
  const handleConfirmDelete = async () => {
    if (!password || password.length < 6) {
      const msg = "Please enter your password";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    setDeleting(true);
    try {
      const res = await requestAccountDeletion(password);

      setPasswordModalVisible(false);
      setPassword("");

      if (res.success) {
        const successMsg =
          "Your account is scheduled for deletion in 7 days.\n\nYou can log back in anytime before then to cancel.";

        if (Platform.OS === "web") {
          window.alert(successMsg);
          logout();
        } else {
          Alert.alert("Account Scheduled for Deletion", successMsg, [
            { text: "OK", onPress: () => logout() },
          ]);
        }
      } else {
        const msg = res.message || "Failed to schedule deletion";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Could not schedule deletion. Try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setDeleting(false);
    }
  };

  // ===== CANCEL DELETION =====
  const handleCancelDeletion = async () => {
    setCancelling(true);
    try {
      const res = await cancelAccountDeletion();
      if (res.success) {
        const msg = "Your account is safe. Welcome back!";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Cancelled", msg);
      }
    } catch (error) {
      const msg = "Could not cancel deletion. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setCancelling(false);
    }
  };

  const Row = ({ icon, label, onPress, danger = false, success = false, loading = false }) => (
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
          color={danger ? colors.danger : success ? colors.success : colors.textPrimary}
        />
        <Text
          style={[
            styles.rowLabel,
            {
              color: danger
                ? colors.danger
                : success
                ? colors.success
                : colors.textPrimary,
            },
          ]}
        >
          {label}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={success ? colors.success : colors.danger} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Deletion Banner */}
        {isPendingDeletion && (
          <View
            style={[
              styles.pendingBanner,
              {
                backgroundColor: colors.danger + "12",
                borderColor: colors.danger + "40",
              },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.pendingTitle, { color: colors.danger }]}>
                Deletion scheduled
              </Text>
              <Text style={[styles.pendingText, { color: colors.textSecondary }]}>
                Your account will be deleted on{" "}
                {new Date(user.scheduledDeletionAt).toLocaleDateString()}.
              </Text>
            </View>
          </View>
        )}

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
          {isPendingDeletion ? (
            <Row
              icon="refresh-outline"
              label={cancelling ? "Cancelling..." : "Cancel Deletion"}
              onPress={handleCancelDeletion}
              success
              loading={cancelling}
            />
          ) : (
            <Row
              icon="trash-outline"
              label={deleting ? "Scheduling..." : "Delete Account"}
              onPress={handleDeleteAccount}
              danger
              loading={deleting}
            />
          )}
        </View>

        {/* Info block */}
        {!isPendingDeletion && (
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.warning + "10",
                borderColor: colors.warning + "30",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.warning}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Deleting your account starts a 7-day grace period. Log back in
              anytime before then to cancel.
            </Text>
          </View>
        )}

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Street v1.0.0
        </Text>
      </ScrollView>

      {/* ===== PASSWORD MODAL ===== */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPasswordModalVisible(false);
          setPassword("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: colors.danger + "15" },
              ]}
            >
              <Ionicons name="lock-closed" size={24} color={colors.danger} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Confirm Your Password
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              Enter your password to schedule account deletion.
            </Text>

            <View
              style={[
                styles.passwordWrap,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoFocus
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
                style={{ padding: 6 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setPassword("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.danger, opacity: deleting ? 0.7 : 1 },
                ]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                    Schedule Deletion
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -8,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 17,
  },

  // Pending banner
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: 24,
    padding: 22,
    width: "88%",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: { fontWeight: "700", fontSize: 14 },
});