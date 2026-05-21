import React, { useMemo, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";

export default function BookingScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);

  const { providerId, serviceTitle, price, description } = route.params;

  // 🧠 Invoice Engine
  const invoice = useMemo(() => {
    const serviceFee = Number(price) || 500;
    const platformFee = 0;
    const total = serviceFee + platformFee;

    return { serviceFee, platformFee, total };
  }, [price]);

  const handleConfirmBooking = async () => {
    try {
      console.log("CREATING BOOKING...");

      // ✅ CREATE BOOKING FIRST
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

      // ✅ GO TO PAYMENT SCREEN
      navigation.navigate("PaymentScreen", {
        bookingId: booking._id,
      });

    } catch (error) {
      console.log("BOOKING ERROR:", error.response?.data || error.message);

      Alert.alert(
        "Booking Error",
        error.response?.data?.message || "Something went wrong"
      );
    }
  };

  return (
    <View style={styles.container}>

      {/* Provider Info */}
      <View style={styles.card}>
        <Text style={styles.title}>Service Summary</Text>
        <Text style={styles.text}>{serviceTitle}</Text>
        <Text style={styles.subText}>{description}</Text>
      </View>

      {/* Invoice Section */}
      <View style={styles.card}>
        <Text style={styles.title}>Invoice</Text>

        <View style={styles.row}>
          <Text>Service Fee</Text>
          <Text>₦{invoice.serviceFee}</Text>
        </View>

        <View style={styles.row}>
          <Text>Platform Fee</Text>
          <Text>₦{invoice.platformFee}</Text>
        </View>

        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>₦{invoice.total}</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleConfirmBooking}
      >
        <Text style={styles.primaryText}>Confirm & Pay</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.secondaryText}>Cancel</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F6FA",
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
  subText: {
    color: "#6B7280",
    marginTop: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  totalRow: {
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    paddingTop: 10,
    marginTop: 10,
  },
  totalText: {
    fontWeight: "bold",
  },
  primaryBtn: {
    backgroundColor: "#0A66FF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  secondaryBtn: {
    padding: 15,
    alignItems: "center",
  },
  secondaryText: {
    color: "#6B7280",
  },
});