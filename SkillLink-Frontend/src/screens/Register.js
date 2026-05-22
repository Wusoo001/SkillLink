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

export default function Register({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Purely visual animation – no logic change
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SkillLink today</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📞</Text>
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                placeholder="Password"
                secureTextEntry
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✅</Text>
              <TextInput
                placeholder="Confirm Password"
                secureTextEntry
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleSignup}
                onPressIn={animateButtonIn}
                onPressOut={animateButtonOut}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonText}>Verify & Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    marginBottom: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    color: "#64748B",
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
});