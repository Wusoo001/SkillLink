import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import axios from "axios";

export default function PaymentReturnHandler({ route, navigation }) {
  const { reference } = route.params || {};

  // ---------------- RESOLVE BOOKING ----------------
  const resolveBooking = async () => {
    try {
      if (!reference) {
        navigation.replace("Home");
        return;
      }

      // Fetch bookings (or better: backend lookup endpoint later)
      const res = await axios.get("/api/bookings");

      const booking = res.data.data.find(
        (b) => b.payment.reference === reference
      );

      if (!booking) {
        navigation.replace("Home");
        return;
      }

      // 🚀 GO TO DASHBOARD (MAIN TARGET)
      navigation.replace("PaymentDashboard", {
        bookingId: booking._id,
        reference,
      });

    } catch (error) {
      console.log("RETURN HANDLER ERROR:", error.response?.data);

      navigation.replace("Home");
    }
  };

  // ---------------- RUN ON LOAD ----------------
  useEffect(() => {
    resolveBooking();
  }, []);

  // ---------------- UI (TEMP LOADING ONLY) ----------------
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>
        Finalizing payment...
      </Text>
    </View>
  );
}