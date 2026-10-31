import { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { submitAppeal, checkRestriction } from "../services/api";

export default function AccountRestrictedScreen({ navigation, route }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const restriction = route.params?.restriction || {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [appeal, setAppeal] = useState(restriction.appeal || null);
  const [currentRestriction, setCurrentRestriction] = useState(restriction);

  const isBanned = currentRestriction.type === "ban";
  const canAppeal = !appeal || appeal.status === "rejected";

  const handleCheckStatus = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Enter email and password to check status");
      return;
    }
    setChecking(true);
    try {
      const res = await checkRestriction({ email: email.trim(), password });
      if (res.success && res.restricted === false) {
        Alert.alert(
          "Restriction Lifted",
          "Your account is no longer restricted. Please sign in again.",
          [{ text: "Sign In", onPress: () => navigation.navigate("Landing") }]
        );
      } else if (res.success && res.restricted === true) {
        setCurrentRestriction(res.restriction);
        setAppeal(res.restriction.appeal);
        Alert.alert("Still Restricted", "Your account is still restricted.");
      } else {
        Alert.alert("Error", res.message || "Could not verify status");
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }
    if (reason.trim().length < 20) {
      Alert.alert("Error", "Please write at least 20 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitAppeal({
        email: email.trim(),
        password,
        reason: reason.trim(),
      });
      if (res.success) {
        setAppeal(res.data);
        Alert.alert(
          "Appeal Submitted",
          "Your appeal has been submitted. You'll receive a response within 10 working days."
        );
      } else {
        Alert.alert("Could Not Submit", res.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isBanned ? colors.danger + "18" : colors.warning + "18" },
            ]}
          >
            <Ionicons
              name={isBanned ? "ban" : "time-outline"}
              size={44}
              color={isBanned ? colors.danger : colors.warning}
            />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isBanned ? "Account Banned" : "Account Suspended"}
        </Text>

        {/* Reason card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>REASON</Text>
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {currentRestriction.reason || "No reason provided"}
          </Text>

          {isBanned && currentRestriction.bannedAt && (
            <>
              <Text style={[styles.cardLabel, { color: colors.textTertiary, marginTop: 14 }]}>
                BANNED ON
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {new Date(currentRestriction.bannedAt).toLocaleDateString()}
              </Text>
            </>
          )}

          {!isBanned && currentRestriction.suspendedUntil && (
            <>
              <Text style={[styles.cardLabel, { color: colors.textTertiary, marginTop: 14 }]}>
                SUSPENDED UNTIL
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {new Date(currentRestriction.suspendedUntil).toLocaleDateString()}
              </Text>
            </>
          )}
        </View>

        {/* Existing appeal status */}
        {appeal && (
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  appeal.status === "accepted"
                    ? colors.success + "10"
                    : appeal.status === "rejected"
                    ? colors.danger + "10"
                    : colors.primaryLight,
                borderColor:
                  appeal.status === "accepted"
                    ? colors.success + "40"
                    : appeal.status === "rejected"
                    ? colors.danger + "40"
                    : colors.primary + "40",
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>
              APPEAL STATUS
            </Text>
            <Text
              style={[
                styles.cardValue,
                {
                  color:
                    appeal.status === "accepted"
                      ? colors.success
                      : appeal.status === "rejected"
                      ? colors.danger
                      : colors.primary,
                  textTransform: "uppercase",
                  fontWeight: "800",
                },
              ]}
            >
              {appeal.status}
            </Text>
            <Text style={[styles.metaText, { color: colors.textSecondary, marginTop: 10 }]}>
              Submitted: {new Date(appeal.submittedAt).toLocaleDateString()}
            </Text>
            {appeal.status === "pending" && appeal.dueBy && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Response due by: {new Date(appeal.dueBy).toLocaleDateString()}
              </Text>
            )}
            {appeal.adminNote && (
              <Text
                style={[
                  styles.metaText,
                  { color: colors.textSecondary, marginTop: 8, fontStyle: "italic" },
                ]}
              >
                "{appeal.adminNote}"
              </Text>
            )}
          </View>
        )}

        {/* ===== EMAIL + PASSWORD (shared for both Check Status and Appeal) ===== */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Sign In to Verify
          </Text>
          <Text style={[styles.helper, { color: colors.textTertiary }]}>
            If your restriction was lifted, sign in to check status or submit an appeal.
          </Text>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={16}
              color={colors.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Your email"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={colors.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Your password"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.textPrimary }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primaryLight,
                borderWidth: 1,
                borderColor: colors.primary,
                opacity: checking ? 0.6 : 1,
              },
            ]}
            onPress={handleCheckStatus}
            disabled={checking}
            activeOpacity={0.9}
          >
            {checking ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={[styles.submitText, { color: colors.primary }]}>
                  Check My Status
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Appeal form (only if not pending) */}
        {canAppeal && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {appeal?.status === "rejected" ? "Submit a New Appeal" : "Appeal This Decision"}
            </Text>
            <Text style={[styles.helper, { color: colors.textTertiary }]}>
              Explain why you believe this action was a mistake. Responses take up to 10 working days.
            </Text>

            <TextInput
              placeholder="Why should we reconsider? (min 20 chars)"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={5}
              maxLength={2000}
            />
            <Text style={[styles.helper, { color: colors.textTertiary, textAlign: "right" }]}>
              {reason.length} / 2000
            </Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 },
              ]}
              onPress={handleSubmitAppeal}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color={colors.textInverse} />
                  <Text style={[styles.submitText, { color: colors.textInverse }]}>
                    Submit Appeal
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.navigate("Landing")}
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: colors.textTertiary }]}>
            ← Back to login
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, flexGrow: 1 },
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
    marginBottom: 24,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6 },
  cardValue: { fontSize: 15, fontWeight: "600", lineHeight: 21 },
  metaText: { fontSize: 12.5, fontWeight: "500" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  helper: { fontSize: 12.5, fontWeight: "500", marginBottom: 12, lineHeight: 17 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 14.5, fontWeight: "500", paddingVertical: 0 },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
    marginTop: 4,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { fontWeight: "700", fontSize: 15 },
  backLink: { alignItems: "center", paddingVertical: 16 },
  backText: { fontSize: 13.5, fontWeight: "600" },
});