import { useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { submitAppeal, checkRestriction } from "../services/api";

const MIN_REASON_LENGTH = 20;

const webAlert = (title, message, onOK) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message || ""}`);
    if (onOK) onOK();
  } else {
    Alert.alert(title, message || "", onOK ? [{ text: "OK", onPress: onOK }] : undefined);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

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
  const [inlineError, setInlineError] = useState("");
  const [appeal, setAppeal] = useState(restriction.appeal || null);
  const [currentRestriction, setCurrentRestriction] = useState(restriction);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hasRestriction =
    !!currentRestriction?.type &&
    (currentRestriction.type === "ban" || currentRestriction.type === "suspension");
  const isBanned = currentRestriction.type === "ban";
  const canAppeal =
    hasRestriction && (!appeal || appeal.status === "rejected");

  const goToLogin = () => {
    // Use reset so user can't back into the restricted screen
    navigation.reset({
      index: 0,
      routes: [{ name: "Landing" }],
    });
  };

  const handleCheckStatus = async () => {
    if (checking || submitting) return;

    Keyboard.dismiss();
    setInlineError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setInlineError("Enter your email and password.");
      return;
    }

    setChecking(true);
    try {
      const res = await checkRestriction({ email: trimmedEmail, password });
      if (!isMountedRef.current) return;

      if (res.success && res.restricted === false) {
        webAlert(
          "Restriction Lifted",
          "Your account is no longer restricted. Please sign in again.",
          goToLogin
        );
      } else if (res.success && res.restricted === true) {
        setCurrentRestriction(res.restriction || currentRestriction);
        setAppeal(res.restriction?.appeal || null);
        webAlert("Still Restricted", "Your account is still restricted.");
      } else {
        setInlineError(res.message || "Could not verify your status.");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setInlineError(
        err?.response?.data?.message || "Network error. Please try again."
      );
    } finally {
      if (isMountedRef.current) setChecking(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (submitting || checking) return;

    Keyboard.dismiss();
    setInlineError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setInlineError("Enter your email and password first.");
      return;
    }
    if (reason.trim().length < MIN_REASON_LENGTH) {
      setInlineError(
        `Please write at least ${MIN_REASON_LENGTH} characters explaining why.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitAppeal({
        email: trimmedEmail,
        password,
        reason: reason.trim(),
      });
      if (!isMountedRef.current) return;

      if (res.success) {
        setAppeal(res.data);
        setReason("");
        webAlert(
          "Appeal Submitted",
          "Your appeal has been submitted. You'll receive a response within 10 working days."
        );
      } else {
        setInlineError(res.message || "Could not submit appeal. Try again.");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setInlineError(
        err?.response?.data?.message || "Network error. Please try again."
      );
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  };

  // ===== MISSING RESTRICTION FALLBACK =====
  if (!hasRestriction) {
    return (
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.warning + "18" },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color={colors.warning}
            />
          </View>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Account Restricted
        </Text>
        <Text style={[styles.helper, { color: colors.textTertiary, textAlign: "center" }]}>
          We couldn't load the restriction details. Try logging in again.
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={goToLogin}
          activeOpacity={0.9}
        >
          <Ionicons name="arrow-back" size={18} color={colors.textInverse} />
          <Text style={[styles.submitText, { color: colors.textInverse }]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reasonLength = reason.length;
  const reasonCountColor =
    reasonLength === 0
      ? colors.textTertiary
      : reason.trim().length < MIN_REASON_LENGTH
      ? colors.warning
      : colors.success;

  const modalBusy = checking || submitting;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isBanned
                  ? colors.danger + "18"
                  : colors.warning + "18",
              },
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

        {/* REASON CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          {currentRestriction.reason ? (
            <>
              <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>
                REASON
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {currentRestriction.reason}
              </Text>
            </>
          ) : null}

          {isBanned && currentRestriction.bannedAt ? (
            <>
              <Text
                style={[
                  styles.cardLabel,
                  { color: colors.textTertiary, marginTop: 14 },
                ]}
              >
                BANNED ON
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {formatDate(currentRestriction.bannedAt)}
              </Text>
            </>
          ) : null}

          {!isBanned && currentRestriction.suspendedUntil ? (
            <>
              <Text
                style={[
                  styles.cardLabel,
                  { color: colors.textTertiary, marginTop: 14 },
                ]}
              >
                SUSPENDED UNTIL
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {formatDate(currentRestriction.suspendedUntil)}
              </Text>
            </>
          ) : null}
        </View>

        {/* APPEAL STATUS */}
        {appeal ? (
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
            {appeal.submittedAt ? (
              <Text
                style={[
                  styles.metaText,
                  { color: colors.textSecondary, marginTop: 10 },
                ]}
              >
                Submitted: {formatDate(appeal.submittedAt)}
              </Text>
            ) : null}
            {appeal.status === "pending" && appeal.dueBy ? (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Response due by: {formatDate(appeal.dueBy)}
              </Text>
            ) : null}
            {appeal.adminNote ? (
              <Text
                style={[
                  styles.metaText,
                  {
                    color: colors.textSecondary,
                    marginTop: 8,
                    fontStyle: "italic",
                  },
                ]}
              >
                "{appeal.adminNote}"
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* INLINE ERROR (replaces alerts on web) */}
        {inlineError ? (
          <View
            style={[
              styles.inlineError,
              {
                backgroundColor: colors.danger + "12",
                borderColor: colors.danger + "40",
              },
            ]}
          >
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.inlineErrorText, { color: colors.danger }]}>
              {inlineError}
            </Text>
          </View>
        ) : null}

        {/* AUTH CARD */}
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
            If your restriction was lifted, sign in to check status or submit
            an appeal.
          </Text>

          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
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
              onChangeText={(t) => {
                setEmail(t);
                if (inlineError) setInlineError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!modalBusy}
            />
          </View>

          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
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
              onChangeText={(t) => {
                setPassword(t);
                if (inlineError) setInlineError("");
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!modalBusy}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ padding: 4 }}
            >
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
                opacity: checking || submitting ? 0.6 : 1,
              },
            ]}
            onPress={handleCheckStatus}
            disabled={modalBusy}
            activeOpacity={0.9}
          >
            {checking ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.submitText, { color: colors.primary }]}>
                  Check My Status
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* APPEAL FORM */}
        {canAppeal ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {appeal?.status === "rejected"
                ? "Submit a New Appeal"
                : "Appeal This Decision"}
            </Text>
            <Text style={[styles.helper, { color: colors.textTertiary }]}>
              Explain why you believe this action was a mistake. Responses take
              up to 10 working days.
            </Text>

            <TextInput
              placeholder={`Why should we reconsider? (min ${MIN_REASON_LENGTH} chars)`}
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
              onChangeText={(t) => {
                setReason(t);
                if (inlineError) setInlineError("");
              }}
              multiline
              numberOfLines={5}
              maxLength={2000}
              editable={!modalBusy}
            />
            <Text
              style={[styles.helper, { color: reasonCountColor, textAlign: "right" }]}
            >
              {reasonLength} / 2000
            </Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting || checking ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmitAppeal}
              disabled={modalBusy}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={18}
                    color={colors.textInverse}
                  />
                  <Text
                    style={[styles.submitText, { color: colors.textInverse }]}
                  >
                    Submit Appeal
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.backLink}
          onPress={goToLogin}
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
  cardLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
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
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inlineErrorText: { fontSize: 12.5, fontWeight: "600", flex: 1 },
  backLink: { alignItems: "center", paddingVertical: 16 },
  backText: { fontSize: 13.5, fontWeight: "600" },
});