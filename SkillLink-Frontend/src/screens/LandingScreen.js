import { useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Animated,
} from "react-native";

export default function Landing({ navigation }) {
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animatePrimaryIn = () => {
    Animated.spring(primaryScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const animatePrimaryOut = () => {
    Animated.spring(primaryScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animateSecondaryIn = () => {
    Animated.spring(secondaryScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const animateSecondaryOut = () => {
    Animated.spring(secondaryScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Background gradient layers */}
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
        
        {/* Decorative floating circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>SkillLink</Text>
            <View style={styles.logoUnderline} />
          </View>

          <Text style={styles.subtitle}>
            Connect with top professionals{'\n'}
            and grow your business
          </Text>

          <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Register")}
              onPressIn={animatePrimaryIn}
              onPressOut={animatePrimaryOut}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Create Account</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Login")}
              onPressIn={animateSecondaryIn}
              onPressOut={animateSecondaryOut}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryText}>Login</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
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
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  gradientTop: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#3B82F6",
    opacity: 0.1,
  },
  gradientBottom: {
    position: "absolute",
    bottom: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#8B5CF6",
    opacity: 0.1,
  },
  circle1: {
    position: "absolute",
    top: "20%",
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#F59E0B",
    opacity: 0.05,
  },
  circle2: {
    position: "absolute",
    bottom: "25%",
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#10B981",
    opacity: 0.06,
  },
  circle3: {
    position: "absolute",
    top: "60%",
    right: "10%",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EF4444",
    opacity: 0.04,
  },
  content: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#0F172A",
    textShadowColor: "rgba(0,0,0,0.05)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoUnderline: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#475569",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 48,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.05)",
  },
  secondaryText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 17,
  },
});