import { useContext, useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Landing({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const { colors } = useTheme();

  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "All fields required");
      return;
    }

    try {
      const response = await loginUser({ email, password });
      if (response.token && response.user) {
        login(response.token, response.user);
      } else {
        Alert.alert("Error", response.message || "Invalid credentials");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Server not reachable");
    }
  };

  const animateButtonIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animateButtonOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.gradientOverlay, { backgroundColor: colors.background }]} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadowColor,
              shadowOpacity: colors.shadowOpacity,
            },
          ]}
        >
          {/* Image Logo */}
          <Image
            source={require('../../assets/images/street_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.logoLine} />

          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Sign in to continue</Text>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
            ]}
          >
            <TextInput
              placeholder="Email address"
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
              styles.inputWrapper,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
            ]}
          >
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
                size={22}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.25,
                },
              ]}
              onPress={handleLogin}
              onPressIn={animateButtonIn}
              onPressOut={animateButtonOut}
              activeOpacity={0.9}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>Login</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={[styles.registerText, { color: colors.textTertiary }]}>
              Don't have an account?{" "}
              <Text style={[styles.registerHighlight, { color: colors.primary }]}>
                Create Account
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 40,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  logoLine: {
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2563EB",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    width: "100%",
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  eyeIcon: {
    paddingHorizontal: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
    width: "100%",
    gap: 10,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.5,
    color: "#FFF",
  },
  registerLink: {
    marginTop: 20,
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 15,
    fontWeight: "500",
  },
  registerHighlight: {
    fontWeight: "700",
  },
});