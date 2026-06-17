import { useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { registerUser } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Register({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      const response = await registerUser({
        name,
        email,
        phone,
        password,
      });

      if (response.success) {
        Alert.alert("Success", "Account created");
        navigation.replace("Login");
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (error) {
      Alert.alert("Error", "Server error");
    }
  };

  const animateButtonIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const animateButtonOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Join SkillLink today</Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Text style={[styles.inputIcon, { color: colors.textTertiary }]}>👤</Text>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
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
              <Text style={[styles.inputIcon, { color: colors.textTertiary }]}>✉️</Text>
              <TextInput
                placeholder="Email Address"
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
              <Text style={[styles.inputIcon, { color: colors.textTertiary }]}>📞</Text>
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
              <Text style={[styles.inputIcon, { color: colors.textTertiary }]}>🔒</Text>
              <TextInput
                placeholder="Password"
                secureTextEntry
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={password}
                onChangeText={setPassword}
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
              <Text style={[styles.inputIcon, { color: colors.textTertiary }]}>✅</Text>
              <TextInput
                placeholder="Confirm Password"
                secureTextEntry
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
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
                onPress={handleSignup}
                onPressIn={animateButtonIn}
                onPressOut={animateButtonOut}
                activeOpacity={0.9}
              >
                <Text style={[styles.buttonText, { color: colors.textInverse }]}>Verify & Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 40,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 32,
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
  },
  inputIcon: { fontSize: 18, marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, fontWeight: "500" },
  button: {
    paddingVertical: 16,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: { fontWeight: "700", fontSize: 17, letterSpacing: 0.3 },
});