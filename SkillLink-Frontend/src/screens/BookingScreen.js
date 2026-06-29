import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { api, getBookingById, cancelBookingRequest, acceptBooking, rejectBooking } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function BookingScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const { providerId, serviceTitle, price, description, providerName, bookingId: existingBookingId, mode, role } = route.params || {};

  const [bookingId, setBookingId] = useState(existingBookingId || null);
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [message, setMessage] = useState("");
  const [invoice, setInvoice] = useState({ serviceFee: 0, platformFee: 0, total: 0 });
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [userRole, setUserRole] = useState(null); // "client" or "provider"

  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  const intervalRef = useRef(null);
  const pollingAttempts = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60;

  // Determine role based on booking data and current user
  const determineRole = (bookingData) => {
    if (!bookingData || !user) return null;
    if (bookingData.client?._id === user._id) return "client";
    if (bookingData.provider?._id === user._id) return "provider";
    return null;
  };

  useEffect(() => {
    if (existingBookingId) {
      loadExistingBooking(existingBookingId);
    } else {
      createBookingRequest();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const loadExistingBooking = async (id) => {
    setLoading(true);
    try {
      const res = await getBookingById(id);
      console.log("📦 [BookingScreen] loadExistingBooking response:", res);
      if (res.success) {
        const data = res.data;
        console.log("📦 [BookingScreen] Booking data:", data);
        setBooking(data);
        setBookingId(data._id);
        setStatus(data.status);
        setMessage(data.message || "");
        // Determine role
        const role = determineRole(data);
        setUserRole(role);
        if (data.status === "pending_acceptance" && role === "client") {
          startPolling(data._id);
        }
      } else {
        Alert.alert("Error", "Could not load booking");
        navigation.goBack();
      }
    } catch (error) {
      console.log("Load booking error:", error);
      Alert.alert("Error", "Failed to load booking");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const createBookingRequest = async () => {
    setLoading(true);
    try {
      const res = await api.post("/bookings", {
        client: user?._id,
        provider: providerId,
        serviceTitle,
        scheduledDate: new Date(),
        price: Number(price),
        message: message || "Service request",
        status: "pending_acceptance",
      });
      if (res.data.success) {
        const newBooking = res.data.data;
        setBookingId(newBooking._id);
        setBooking(newBooking);
        setStatus("pending_acceptance");
        setUserRole("client");
        pollingAttempts.current = 0;
        startPolling(newBooking._id);
      } else {
        Alert.alert("Error", "Failed to create booking request");
        navigation.goBack();
      }
    } catch (error) {
      console.log("Create booking error:", error);
      Alert.alert("Error", "Failed to create booking");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(true);
    pollingAttempts.current = 0;
    intervalRef.current = setInterval(async () => {
      try {
        pollingAttempts.current += 1;
        if (pollingAttempts.current >= MAX_POLLING_ATTEMPTS) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setPolling(false);
          Alert.alert(
            "Request Timeout",
            "The provider hasn't responded within 3 minutes. You can try again later."
          );
          navigation.goBack();
          return;
        }
        const res = await getBookingById(id);
        if (res.success) {
          const data = res.data;
          setBooking(data);
          const newStatus = data.status;
          if (newStatus !== status) {
            setStatus(newStatus);
          }
          if (newStatus === "accepted" || newStatus === "rejected" || newStatus === "cancelled") {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setPolling(false);
          }
        }
      } catch (error) {
        console.log("Polling error:", error);
      }
    }, 3000);
  };

  const manualRefresh = async () => {
    if (!bookingId) return;
    setRefreshingStatus(true);
    try {
      const res = await getBookingById(bookingId);
      if (res.success) {
        const data = res.data;
        setBooking(data);
        const newStatus = data.status;
        if (newStatus !== status) {
          setStatus(newStatus);
        }
        if (newStatus === "accepted" || newStatus === "rejected" || newStatus === "cancelled") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setPolling(false);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Could not refresh status.");
    } finally {
      setRefreshingStatus(false);
    }
  };

  useEffect(() => {
    if (booking?.price && status === "accepted") {
      const serviceFee = Number(booking.price) || 0;
      const platformFee = 0;
      const total = serviceFee + platformFee;
      setInvoice({ serviceFee, platformFee, total });
    }
  }, [booking, status]);

  // ---- Provider Accept/Reject actions ----
  const handleAccept = async () => {
    try {
      await acceptBooking(bookingId);
      setStatus("accepted");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPolling(false);
      Alert.alert("Accepted", "You have accepted this booking.");
      // Refresh to update UI
      await loadExistingBooking(bookingId);
    } catch (error) {
      Alert.alert("Error", "Could not accept booking.");
    }
  };

  const handleReject = async () => {
    try {
      await rejectBooking(bookingId);
      setStatus("rejected");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPolling(false);
      Alert.alert("Declined", "You have declined this booking.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Could not decline booking.");
    }
  };

  const handleCancelRequest = async () => {
    if (!bookingId) return;
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            setCancelLoading(true);
            try {
              await cancelBookingRequest(bookingId);
              setStatus("cancelled");
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              setPolling(false);
              Alert.alert("Cancelled", "Request cancelled successfully");
              navigation.goBack();
            } catch (error) {
              console.log("Cancel error:", error);
              Alert.alert("Error", "Could not cancel request. Please try again.");
            } finally {
              setCancelLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmBooking = async () => {
    console.log("💳 [BookingScreen] handleConfirmBooking called with bookingId:", bookingId);
    navigation.navigate("PaymentScreen", {
      bookingId: bookingId,
      amount: invoice.total,
      serviceTitle: serviceTitle || booking?.serviceTitle,
    });
  };

  const animatePressIn = (scale) => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animatePressOut = (scale) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading request...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Pending acceptance UI ----
  if (status === "pending_acceptance") {
    // If the current user is the provider, show accept/reject buttons
    if (userRole === "provider") {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Booking Request</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
              <Ionicons name="time-outline" size={48} color={colors.warning} style={styles.iconCenter} />
              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>New Booking Request</Text>
              <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                {booking?.client?.name || "A client"} wants to book your service: {booking?.serviceTitle}
              </Text>
              <Text style={[styles.priceDisplay, { color: colors.primary }]}>
                ₦{booking?.price?.toLocaleString()}
              </Text>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.acceptButton, { backgroundColor: colors.success }]}
                  onPress={handleAccept}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectButton, { backgroundColor: colors.danger }]}
                  onPress={handleReject}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Otherwise (client) show waiting UI with cancel option
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Booking Request</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
            <Ionicons name="time-outline" size={48} color={colors.warning} style={styles.iconCenter} />
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Waiting for Provider</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
              Your request has been sent to {booking?.provider?.name || "the provider"}.
              They will accept or decline shortly.
            </Text>

            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.primary }]}
              onPress={manualRefresh}
              disabled={refreshingStatus}
            >
              <Text style={[styles.refreshButtonText, { color: colors.textInverse }]}>
                {refreshingStatus ? "Refreshing..." : "Refresh Status"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.danger }]}
              onPress={handleCancelRequest}
              disabled={cancelLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textInverse }]}>
                {cancelLoading ? "Cancelling..." : "Cancel Request"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Rejected UI ----
  if (status === "rejected") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
            <Ionicons name="close-circle-outline" size={48} color={colors.danger} style={styles.iconCenter} />
            <Text style={[styles.statusTitle, { color: colors.danger }]}>Request Declined</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
              {userRole === "provider" ? "You declined this request." : "The provider declined your request."}
            </Text>
            <TouchableOpacity style={[styles.goBackButton, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.goBackButtonText, { color: colors.textInverse }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Cancelled UI ----
  if (status === "cancelled") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
            <Ionicons name="ban-outline" size={48} color={colors.textTertiary} style={styles.iconCenter} />
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Request Cancelled</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
              This request has been cancelled.
            </Text>
            <TouchableOpacity style={[styles.goBackButton, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.goBackButtonText, { color: colors.textInverse }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Accepted UI ----
  if (status === "accepted") {
    // If provider, show waiting message + back
    if (userRole === "provider") {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={styles.container}>
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Booking Accepted</Text>
              </View>
              <Text style={[styles.acceptedMessage, { color: colors.textSecondary }]}>
                You have accepted this booking. Waiting for the client to complete payment.
              </Text>
              <TouchableOpacity
                style={[styles.goBackButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.goBackButtonText, { color: colors.textInverse }]}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Client: show invoice + pay
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Request Accepted</Text>
              </View>
              <Text style={[styles.acceptedMessage, { color: colors.textSecondary }]}>
                {booking?.provider?.name || "Provider"} has accepted your request.
                You can now proceed to payment.
              </Text>
            </View>

            <View style={[styles.card, styles.invoiceCard, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
              <Text style={[styles.invoiceTitle, { color: colors.textPrimary }]}>Invoice</Text>
              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, { color: colors.textTertiary }]}>Service Fee</Text>
                <Text style={[styles.invoiceValue, { color: colors.textPrimary }]}>₦{invoice.serviceFee.toLocaleString()}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, { color: colors.textTertiary }]}>Platform Fee</Text>
                <Text style={[styles.invoiceValue, { color: colors.textPrimary }]}>₦{invoice.platformFee.toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={[styles.invoiceRow, styles.totalRow]}>
                <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
                <Text style={[styles.totalAmount, { color: colors.primary }]}>₦{invoice.total.toLocaleString()}</Text>
              </View>
            </View>

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
                onPressIn={() => animatePressIn(primaryScale)}
                onPressOut={() => animatePressOut(primaryScale)}
                activeOpacity={0.9}
              >
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>Confirm & Pay</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Release / Completed (optional) ----
  if (status === "released" && userRole === "client" && !booking?.reviewed) {
    // Show review option
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
            <Ionicons name="star-outline" size={48} color={colors.warning} style={styles.iconCenter} />
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>Job Completed!</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
              Funds have been released to the provider. You can now leave a review.
            </Text>
            <TouchableOpacity
              style={[styles.reviewButton, { backgroundColor: colors.success }]}
              onPress={() => {
                // Navigate to Dashboard with review modal? But we can just go back and let user review from dashboard.
                navigation.goBack();
                // Optionally, we could navigate to Dashboard and open review modal, but easier to just go back.
              }}
            >
              <Text style={[styles.reviewButtonText, { color: colors.textInverse }]}>Leave a Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={{ color: colors.textPrimary }}>Unknown status: {status}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.goBackButton, { marginTop: 20, backgroundColor: colors.primary }]}>
          <Text style={[styles.goBackButtonText, { color: colors.textInverse }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingVertical: 24 },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", flex: 1, textAlign: "center" },
  placeholder: { width: 40 },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  iconCenter: { alignSelf: "center", marginBottom: 16 },
  statusTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  statusSubtitle: { fontSize: 16, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  priceDisplay: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 20 },
  refreshButton: { paddingVertical: 12, borderRadius: 40, alignItems: "center", marginBottom: 12 },
  refreshButtonText: { fontWeight: "600", fontSize: 16 },
  cancelButton: { paddingVertical: 12, borderRadius: 40, alignItems: "center" },
  cancelButtonText: { fontWeight: "600", fontSize: 16 },
  goBackButton: { paddingVertical: 12, borderRadius: 40, alignItems: "center", marginTop: 12 },
  goBackButtonText: { fontWeight: "600", fontSize: 16 },
  requestActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: "center",
  },
  actionButtonText: { fontWeight: "700", fontSize: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  acceptedMessage: { fontSize: 15, lineHeight: 22 },
  invoiceCard: { padding: 20 },
  invoiceTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  invoiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8 },
  invoiceLabel: { fontSize: 15, fontWeight: "500" },
  invoiceValue: { fontSize: 15, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 12 },
  totalRow: { marginTop: 4 },
  totalLabel: { fontSize: 17, fontWeight: "700" },
  totalAmount: { fontSize: 20, fontWeight: "800" },
  primaryBtn: { paddingVertical: 16, borderRadius: 48, alignItems: "center", marginBottom: 16, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 },
  primaryText: { fontWeight: "700", fontSize: 17, letterSpacing: 0.3 },
  reviewButton: { paddingVertical: 14, borderRadius: 40, alignItems: "center" },
  reviewButtonText: { fontWeight: "700", fontSize: 16 },
});