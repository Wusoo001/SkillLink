import { useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { registerUser } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Register({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleSignup = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "All fields required");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await registerUser({ name, email, phone, password });

      if (response.success) {
        Alert.alert("Success", "Account created! Please verify your email.");
        navigation.replace("VerificationPending", { email });
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (error) {
      Alert.alert("Error", "Server error");
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
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== BRAND HEADER ===== */}
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

          {/* ===== REGISTER CARD ===== */}
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
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              Join Street today
            </Text>

            {/* Full name */}
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
                name="person-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

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
                placeholder="Email Address"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Phone */}
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
                name="phone-portrait-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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

            {/* Confirm password */}
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
                name="shield-checkmark-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Confirm Password"
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Submit button */}
            <Animated.View
              style={{ transform: [{ scale: buttonScale }], width: "100%" }}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={handleSignup}
                onPressIn={animateButtonIn}
                onPressOut={animateButtonOut}
                activeOpacity={0.9}
              >
                <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                  Verify & Continue
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </TouchableOpacity>
            </Animated.View>

            {/* Login link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.replace("Landing")}
              activeOpacity={0.7}
            >
              <Text style={[styles.loginText, { color: colors.textTertiary }]}>
                Already have an account?{" "}
                <Text style={[styles.loginHighlight, { color: colors.primary }]}>
                  Login
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  // ===== BRAND =====
  brand: {
    alignItems: "center",
    marginBottom: 22,
  },
  logoImage: {
    width: 82,
    height: 82,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  // ===== CARD =====
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
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

  // ===== INPUTS =====
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

  // ===== BUTTON =====
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

  // ===== FOOTER LINK =====
  loginLink: {
    marginTop: 18,
    paddingVertical: 6,
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