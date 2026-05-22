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
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../services/api";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  
  // Purely visual animation – no logic change
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "All fields required");
      return;
    }

    try {
      const response = await loginUser({ email, password });
      console.log("Login response:", response);

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
        <View style={styles.gradientOverlay} />
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              placeholder="Email address"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
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

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              onPressIn={animateButtonIn}
              onPressOut={animateButtonOut}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F8FAFC",
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