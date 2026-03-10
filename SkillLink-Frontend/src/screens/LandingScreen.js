import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Landing({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SkillLink</Text>

      <Text style={styles.subtitle}>
        The Marketplace for Skills & Services
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.primaryText}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.secondaryText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 50,
  },
  primaryButton: {
    backgroundColor: "#0A66FF",
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0A66FF",
    alignItems: "center",
  },
  secondaryText: {
    color: "#0A66FF",
    fontWeight: "600",
    fontSize: 16,
  },
});
