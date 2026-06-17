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
import { useTheme } from "../context/ThemeContext";

export default function BookingScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { providerId, serviceTitle, price, description } = route.params;
  const { colors } = useTheme();

  // ✅ Validate price – must be a positive number
  const isValidPrice = useMemo(() => {
    const num = Number(price);
    return !isNaN(num) && num > 0;
  }, [price]);

  // Button animations
  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  // Invoice – no fallback; uses actual price only if valid
  const invoice = useMemo(() => {
    const serviceFee = isValidPrice ? Number(price) : 0;
    const platformFee = 0;
    const total = serviceFee + platformFee;
    return { serviceFee, platformFee, total };
  }, [price, isValidPrice]);

  const handleConfirmBooking = async () => {
    if (!isValidPrice) {
      Alert.alert("Error", "Invalid service fee. Please contact the provider.");
      return;
    }

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
      navigation.navigate("PaymentScreen", {
        bookingId: booking._id,
        amount: invoice.total,
        serviceTitle: serviceTitle,
      });
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

  // Show error screen if price is invalid
  if (!isValidPrice) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.danger }]}>Invalid Service Fee</Text>
          <Text style={[styles.errorMessage, { color: colors.textTertiary }]}>
            The service fee provided by the professional is invalid or missing.
            Please contact the service provider.
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.errorButtonText, { color: colors.textInverse }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Provider Info Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.shadowColor,
                shadowOpacity: colors.shadowOpacity,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Service Summary</Text>
              <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.serviceTitle, { color: colors.textPrimary }]}>{serviceTitle}</Text>
            {description ? (
              <Text style={[styles.serviceDescription, { color: colors.textTertiary }]}>{description}</Text>
            ) : null}
          </View>

          {/* Invoice Card */}
          <View
            style={[
              styles.card,
              styles.invoiceCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.shadowColor,
                shadowOpacity: colors.shadowOpacity,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Invoice</Text>
              <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
            </View>

            <View style={styles.invoiceRow}>
              <Text style={[styles.invoiceLabel, { color: colors.textTertiary }]}>Service Fee</Text>
              <Text style={[styles.invoiceValue, { color: colors.textPrimary }]}>₦{invoice.serviceFee.toLocaleString()}</Text>
            </View>

            <View style={styles.invoiceRow}>
              <Text style={[styles.invoiceLabel, { color: colors.textTertiary }]}>Platform Fee</Text>
              <Text style={[styles.invoiceValue, { color: colors.textPrimary }]}>₦{invoice.platformFee.toLocaleString()}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

            <View style={[styles.invoiceRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>₦{invoice.total.toLocaleString()}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.2,
                },
              ]}
              onPress={handleConfirmBooking}
              onPressIn={animatePrimaryIn}
              onPressOut={animatePrimaryOut}
              activeOpacity={0.9}
            >
              <Text style={[styles.primaryText, { color: colors.textInverse }]}>Confirm & Pay</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: secondaryScale }] }}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.gray }]}
              onPress={() => navigation.goBack()}
              onPressIn={animateSecondaryIn}
              onPressOut={animateSecondaryOut}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingVertical: 24 },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  invoiceCard: {},
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  titleAccent: { width: 4, height: 20, borderRadius: 2, marginLeft: 10 },
  serviceTitle: { fontSize: 17, fontWeight: "600", marginBottom: 6 },
  serviceDescription: { fontSize: 14, lineHeight: 20 },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  invoiceLabel: { fontSize: 15, fontWeight: "500" },
  invoiceValue: { fontSize: 15, fontWeight: "600" },
  divider: { height: 1, marginVertical: 12 },
  totalRow: { marginTop: 4 },
  totalLabel: { fontSize: 17, fontWeight: "700" },
  totalAmount: { fontSize: 20, fontWeight: "800" },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 48,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: { fontWeight: "700", fontSize: 17, letterSpacing: 0.3 },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 48,
    marginBottom: 20,
  },
  secondaryText: { fontWeight: "600", fontSize: 16 },
  // Error screen styles
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  errorTitle: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  errorMessage: { fontSize: 16, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  errorButton: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 40 },
  errorButtonText: { fontWeight: "600", fontSize: 16 },
});