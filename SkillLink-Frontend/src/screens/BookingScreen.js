import React, { useMemo, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  ScrollView,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";

export default function BookingScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { providerId, serviceTitle, price, description } = route.params;

  // Button animations (purely visual)
  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  // 🧠 Invoice Engine (unchanged)
  const invoice = useMemo(() => {
    const serviceFee = Number(price) || 500;
    const platformFee = 0;
    const total = serviceFee + platformFee;
    return { serviceFee, platformFee, total };
  }, [price]);

  const handleConfirmBooking = async () => {
    try {
      console.log("CREATING BOOKING...");

      const res = await api.post("/bookings", {
        client: user?._id,
        provider: providerId,
        serviceTitle,
        scheduledDate: new Date(),
        price: invoice.total,
      });

      console.log("BOOKING RESPONSE:", res.data);

      if (!res.data.success) {
        Alert.alert("Error", res.data.message);
        return;
      }

      const booking = res.data.data;
      navigation.navigate("PaymentScreen", { bookingId: booking._id });
    } catch (error) {
      console.log("BOOKING ERROR:", error.response?.data || error.message);
      Alert.alert(
        "Booking Error",
        error.response?.data?.message || "Something went wrong"
      );
    }
  };

  const animatePrimaryIn = () => {
    Animated.spring(primaryScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animatePrimaryOut = () => {
    Animated.spring(primaryScale, { toValue: 1, useNativeDriver: true }).start();
  };
  const animateSecondaryIn = () => {
    Animated.spring(secondaryScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animateSecondaryOut = () => {
    Animated.spring(secondaryScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Provider Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Service Summary</Text>
              <View style={styles.titleAccent} />
            </View>
            <Text style={styles.serviceTitle}>{serviceTitle}</Text>
            {description ? (
              <Text style={styles.serviceDescription}>{description}</Text>
            ) : null}
          </View>

          {/* Invoice Card */}
          <View style={[styles.card, styles.invoiceCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Invoice</Text>
              <View style={styles.titleAccent} />
            </View>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Service Fee</Text>
              <Text style={styles.invoiceValue}>₦{invoice.serviceFee.toLocaleString()}</Text>
            </View>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Platform Fee</Text>
              <Text style={styles.invoiceValue}>₦{invoice.platformFee.toLocaleString()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.invoiceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₦{invoice.total.toLocaleString()}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleConfirmBooking}
              onPressIn={animatePrimaryIn}
              onPressOut={animatePrimaryOut}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Confirm & Pay</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.goBack()}
              onPressIn={animateSecondaryIn}
              onPressOut={animateSecondaryOut}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  invoiceCard: {
    backgroundColor: "#FFFFFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  titleAccent: {
    width: 4,
    height: 20,
    backgroundColor: "#2563EB",
    borderRadius: 2,
    marginLeft: 10,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  invoiceLabel: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },
  invoiceValue: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2563EB",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 48,
    backgroundColor: "#F1F5F9",
    marginBottom: 20,
  },
  secondaryText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 16,
  },
});