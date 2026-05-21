import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import axios from "axios";

export default function PaymentDashboard({ route }) {
  const { bookingId } = route.params;

  // ---------------- STATE ----------------
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ---------------- FETCH BOOKING ----------------
  const fetchBooking = async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/bookings");

      const found = res.data.data.find(
        (b) => b._id === bookingId
      );

      setBooking(found);
    } catch (error) {
      console.log("FETCH ERROR:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- VERIFY PAYMENT ----------------
  const handleVerifyPayment = async () => {
    try {
      setActionLoading(true);
      setMessage("");

      const reference = booking?.payment?.reference;

      const res = await axios.get(
        `/api/bookings/verify-payment/${reference}`
      );

      setBooking(res.data.data);
      setMessage(res.data.message);

    } catch (error) {
      console.log("VERIFY ERROR:", error.response?.data);

      setMessage(
        error.response?.data?.message || "Verification failed"
      );

    } finally {
      setActionLoading(false);
    }
  };

  // ---------------- AUTO POLLING (ESCROW LAYER) ----------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        booking?.payment?.status === "pending" ||
        booking?.status === "awaiting_payment"
      ) {
        handleVerifyPayment();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [booking]);

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    fetchBooking();
  }, []);

  // ---------------- STATUS COLOR ENGINE ----------------
  const getColor = (status) => {
    switch (status) {
      case "paid":
      case "funded":
      case "paid_in_escrow":
        return "green";

      case "pending":
      case "awaiting_payment":
        return "orange";

      case "failed":
      case "cancelled":
        return "red";

      default:
        return "gray";
    }
  };

  // ---------------- LOADING STATE ----------------
  if (loading || !booking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text>Loading payment dashboard...</Text>
      </View>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <View style={{ padding: 20, flex: 1 }}>

      {/* HEADER */}
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Payment Dashboard
      </Text>

      {/* BOOKING INFO */}
      <View style={{ marginTop: 20 }}>
        <Text>Service: {booking.serviceTitle}</Text>
        <Text>Price: ₦{booking.price}</Text>

        <Text style={{ marginTop: 10 }}>
          Booking Status:{" "}
          <Text style={{ color: getColor(booking.status) }}>
            {booking.status}
          </Text>
        </Text>
      </View>

      {/* PAYMENT INFO */}
      <View style={{ marginTop: 20 }}>
        <Text>
          Payment Status:{" "}
          <Text style={{ color: getColor(booking.payment.status) }}>
            {booking.payment.status}
          </Text>
        </Text>

        <Text>
          Escrow Status:{" "}
          <Text style={{ color: getColor(booking.payment.escrowStatus) }}>
            {booking.payment.escrowStatus}
          </Text>
        </Text>

        <Text style={{ marginTop: 5 }}>
          Reference: {booking.payment.reference}
        </Text>
      </View>

      {/* MESSAGE */}
      {message !== "" && (
        <Text style={{ marginTop: 15, color: "blue" }}>
          {message}
        </Text>
      )}

      {/* ACTIONS */}
      <View style={{ marginTop: 30 }}>

        {/* PAY BUTTON (only if not paid) */}
        {booking.payment.status === "pending" && (
          <Button
            title="Pay Now"
            onPress={() => console.log("Redirect to Paystack")}
          />
        )}

        {/* VERIFY BUTTON */}
        {booking.payment.status !== "paid" && (
          <View style={{ marginTop: 10 }}>
            <Button
              title={
                actionLoading
                  ? "Verifying..."
                  : "Check Payment Status"
              }
              onPress={handleVerifyPayment}
            />
          </View>
        )}

        {/* SUCCESS STATE */}
        {booking.payment.status === "paid" &&
          booking.payment.escrowStatus === "funded" && (
            <Text style={{ marginTop: 15, color: "green" }}>
              ✔ Payment confirmed and funds secured in escrow
            </Text>
          )}
      </View>

    </View>
  );
}