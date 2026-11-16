import { useContext, useState, useRef, useEffect } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

export default function Landing({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const buttonScale = useRef(new Animated.Value(1)).current;

  // Check for stored restriction info (user got banned while logged in)
  useEffect(() => {
    const checkRestriction = async () => {
      try {
        const stored = await AsyncStorage.getItem("restrictionInfo");
        if (!stored) return;
        await AsyncStorage.removeItem("restrictionInfo");

        let parsed;
        try {
          parsed = JSON.parse(stored);
        } catch {
          return; // Malformed storage — silently ignore
        }

        // Accept either { restriction: {...} } OR the raw restriction object
        const restriction = parsed?.restriction || parsed;
        if (
          restriction &&
          typeof restriction === "object" &&
          (restriction.type === "ban" || restriction.type === "suspension")
        ) {
          navigation.navigate("AccountRestricted", { restriction });
        }
      } catch {
        // Silently fail — restriction check shouldn't block login
      }
    };
    checkRestriction();
  }, [navigation]);

  const handleLogin = async () => {
    if (submitting) return;

    Keyboard.dismiss();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      webAlert("Missing info", "Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await loginUser({
        email: trimmedEmail,
        password,
      });

      // Success path — clean single check
      if (response.token && response.user) {
        // Clear any stale restriction info from previous session
        try {
          await AsyncStorage.removeItem("restrictionInfo");
        } catch {}
        login(response.token, response.user);
        return;
      }

      // Banned or suspended
      if (
        response.code === "ACCOUNT_BANNED" ||
        response.code === "ACCOUNT_SUSPENDED"
      ) {
        navigation.navigate("AccountRestricted", {
          restriction: response.restriction || {
            type: response.code === "ACCOUNT_BANNED" ? "ban" : "suspension",
            reason: response.message,
          },
        });
        return;
      }

      // Unverified email — backend message mentions "verify"
      const message = response.message || "";
      if (/verify/i.test(message)) {
        navigation.navigate("VerificationPending", { email: trimmedEmail });
        return;
      }

      // Generic failure
      webAlert("Login failed", message || "Invalid credentials.");
    } catch (error) {
      webAlert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Server not reachable. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const animateButtonIn = () => {
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animateButtonOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* BRAND HEADER */}
          <View style={styles.brand}>
            <Image
              source={require("../../assets/images/street_logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>
              Street
            </Text>
            <Text style={[styles.brandTagline, { color: colors.textTertiary }]}>
              Find trusted professionals near you
            </Text>
          </View>

          {/* LOGIN CARD */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              Sign in to continue
            </Text>

            {/* Email */}
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            {/* Password */}
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Login button */}
            <Animated.View
              style={{ transform: [{ scale: buttonScale }], width: "100%" }}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    opacity: submitting ? 0.7 : 1,
                  },
                ]}
                onPress={handleLogin}
                onPressIn={animateButtonIn}
                onPressOut={animateButtonOut}
                activeOpacity={0.9}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Text
                      style={[styles.buttonText, { color: colors.textInverse }]}
                    >
                      Login
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.textInverse}
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Register link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.7}
              disabled={submitting}
            >
              <Text style={[styles.registerText, { color: colors.textTertiary }]}>
                Don't have an account?{" "}
                <Text
                  style={[styles.registerHighlight, { color: colors.primary }]}
                >
                  Create Account
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  brand: {
    alignItems: "center",
    marginBottom: 26,
  },
  logoImage: {
    width: 88,
    height: 88,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 12.5,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 22,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    width: "100%",
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  eyeIcon: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    marginTop: 8,
    width: "100%",
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },

  registerLink: {
    marginTop: 18,
    paddingVertical: 6,
  },
  registerText: {
    fontSize: 13.5,
    fontWeight: "500",
    textAlign: "center",
  },
  registerHighlight: {
    fontWeight: "800",
  },
});