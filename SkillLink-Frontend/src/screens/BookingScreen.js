import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../../context/AuthContext";
import {
  api,
  getBookingById,
  cancelBookingRequest,
  acceptBooking,
  rejectBooking,
} from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function BookingScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    providerId,
    serviceTitle,
    price,
    description,
    providerName,
    bookingId: existingBookingId,
    mode,
    role,
    postId,
  } = route.params || {};

  const [bookingId, setBookingId] = useState(existingBookingId || null);
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [message, setMessage] = useState("");
  const [invoice, setInvoice] = useState({ serviceFee: 0, platformFee: 0, total: 0 });
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;

  const intervalRef = useRef(null);
  const pollingAttempts = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60;

  // ===== ROLE =====
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
      if (res.success) {
        const data = res.data;
        setBooking(data);
        setBookingId(data._id);
        setStatus(data.status);
        setMessage(data.message || "");
        const r = determineRole(data);
        setUserRole(r);
        if (data.status === "pending_acceptance" && r === "client") {
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
        post: postId,
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
          if (newStatus !== status) setStatus(newStatus);
          if (
            newStatus === "accepted" ||
            newStatus === "rejected" ||
            newStatus === "cancelled"
          ) {
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
        if (newStatus !== status) setStatus(newStatus);
        if (
          newStatus === "accepted" ||
          newStatus === "rejected" ||
          newStatus === "cancelled"
        ) {
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

  // ===== ACTIONS =====
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
    navigation.navigate("PaymentScreen", {
      bookingId: bookingId,
      amount: invoice.total,
      serviceTitle: serviceTitle || booking?.serviceTitle,
    });
  };

  const animatePressIn = (scale) => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = (scale) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  // ===== SHARED BACK HEADER =====
  const BackHeader = ({ title = "Booking" }) => (
    <View style={styles.header}>
      <TouchableOpacity
        style={[
          styles.backButton,
          { backgroundColor: colors.card, borderColor: colors.inputBorder },
        ]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text
        style={[styles.headerTitle, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={styles.placeholder} />
    </View>
  );

  // ===== STATUS BADGE HELPER =====
  const StatusBadge = ({ label, color }) => (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: color + "18", borderColor: color + "40" },
      ]}
    >
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );

  // ===== LOADING =====
  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
          <BackHeader title="Booking" />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
              Loading request...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ================= PENDING ACCEPTANCE =================
  if (status === "pending_acceptance") {
    // Provider view
    if (userRole === "provider") {
      return (
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 32,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              <BackHeader title="Booking Request" />

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    shadowColor: colors.shadowColor,
                  },
                ]}
              >
                <View style={styles.iconWrap}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.warning + "20" },
                    ]}
                  >
                    <Ionicons name="time-outline" size={32} color={colors.warning} />
                  </View>
                </View>

                <StatusBadge label="Pending Request" color={colors.warning} />

                <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                  New Booking Request
                </Text>
                <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                  <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                    {booking?.client?.name || "A client"}
                  </Text>{" "}
                  wants to book your service
                </Text>

                <View
                  style={[
                    styles.serviceBox,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.serviceLabel, { color: colors.textTertiary }]}
                  >
                    Service
                  </Text>
                  <Text
                    style={[styles.serviceValue, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {booking?.serviceTitle}
                  </Text>
                  <Text style={[styles.priceHero, { color: colors.primary }]}>
                    ₦{booking?.price?.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[
                      styles.rejectOutline,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                    onPress={handleReject}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.danger }]}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.acceptFill,
                      {
                        backgroundColor: colors.success,
                        shadowColor: colors.success,
                      },
                    ]}
                    onPress={handleAccept}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[styles.actionButtonText, { color: colors.textInverse }]}
                    >
                      Accept
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    // Client view
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <BackHeader title="Booking Request" />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.inputBorder,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.warning + "20" },
                  ]}
                >
                  <Ionicons name="time-outline" size={32} color={colors.warning} />
                </View>
              </View>

              <StatusBadge label="Pending Request" color={colors.warning} />

              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                Waiting for Provider
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                Your request has been sent to{" "}
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                  {booking?.provider?.name || "the provider"}
                </Text>
                . They will accept or decline shortly.
              </Text>

              {polling && (
                <View style={styles.pollingHint}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.pollingText, { color: colors.textTertiary }]}>
                    Checking for updates...
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={manualRefresh}
                disabled={refreshingStatus}
                activeOpacity={0.9}
              >
                {refreshingStatus ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={colors.textInverse}
                    />
                    <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                      Refresh Status
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outlineBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                  },
                ]}
                onPress={handleCancelRequest}
                disabled={cancelLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.outlineBtnText, { color: colors.danger }]}>
                  {cancelLoading ? "Cancelling..." : "Cancel Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ================= REJECTED =================
  if (status === "rejected") {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.container}>
            <BackHeader title="Booking" />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.inputBorder,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.danger + "20" },
                  ]}
                >
                  <Ionicons name="close-circle-outline" size={32} color={colors.danger} />
                </View>
              </View>

              <StatusBadge label="Declined" color={colors.danger} />

              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                Request Declined
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                {userRole === "provider"
                  ? "You declined this request."
                  : "The provider declined your request."}
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Go Back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ================= CANCELLED =================
  if (status === "cancelled") {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.container}>
            <BackHeader title="Booking" />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.inputBorder,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.textTertiary + "20" },
                  ]}
                >
                  <Ionicons name="ban-outline" size={32} color={colors.textTertiary} />
                </View>
              </View>

              <StatusBadge label="Cancelled" color={colors.textTertiary} />

              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                Request Cancelled
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                This request has been cancelled.
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Go Back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ================= ACCEPTED =================
  if (status === "accepted") {
    // Provider view — waiting for client to pay
    if (userRole === "provider") {
      return (
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
            ]}
          >
            <View style={styles.container}>
              <BackHeader title="Booking" />

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    shadowColor: colors.shadowColor,
                  },
                ]}
              >
                <View style={styles.iconWrap}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.success + "20" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={32}
                      color={colors.success}
                    />
                  </View>
                </View>

                <StatusBadge label="Accepted" color={colors.success} />

                <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                  Booking Accepted
                </Text>
                <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                  You have accepted this booking. Waiting for the client to complete
                  payment.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                    },
                  ]}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                    Go Back
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    // Client view — invoice + pay
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <BackHeader title="Booking Confirmed" />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.inputBorder,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.success + "20" },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={32}
                    color={colors.success}
                  />
                </View>
              </View>

              <StatusBadge label="Accepted" color={colors.success} />

              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                Request Accepted
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                  {booking?.provider?.name || "Provider"}
                </Text>{" "}
                has accepted your request. Proceed to payment to confirm the booking.
              </Text>
            </View>

            {/* Invoice card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.inputBorder,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View
                style={[
                  styles.invoiceHeader,
                  { borderBottomColor: colors.inputBorder },
                ]}
              >
                <View
                  style={[
                    styles.cardIconWrap,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons name="receipt-outline" size={17} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Invoice
                </Text>
              </View>

              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, { color: colors.textTertiary }]}>
                  Service Fee
                </Text>
                <Text style={[styles.invoiceValue, { color: colors.textPrimary }]}>
                  ₦{invoice.serviceFee.toLocaleString()}
                </Text>
              </View>

              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, { color: colors.textTertiary }]}>
                  Platform Fee
                </Text>
                <Text style={[styles.invoiceValue, { color: colors.textPrimary }]}>
                  ₦{invoice.platformFee.toLocaleString()}
                </Text>
              </View>

              <View
                style={[
                  styles.dashedDivider,
                  { borderColor: colors.inputBorder },
                ]}
              />

              <View style={styles.invoiceRow}>
                <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
                  Total
                </Text>
                <Text style={[styles.totalAmount, { color: colors.primary }]}>
                  ₦{invoice.total.toLocaleString()}
                </Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: primaryScale }] }}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={handleConfirmBooking}
                onPressIn={() => animatePressIn(primaryScale)}
                onPressOut={() => animatePressOut(primaryScale)}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textInverse}
                />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Confirm & Pay
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.textInverse}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ================= RELEASED (review prompt) =================
  if (status === "released" && userRole === "client" && !booking?.reviewed) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.container}>
            <BackHeader title="Booking" />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.inputBorder,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.warning + "20" },
                  ]}
                >
                  <Ionicons name="star-outline" size={32} color="#F59E0B" />
                </View>
              </View>

              <StatusBadge label="Completed" color={colors.success} />

              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                Job Completed!
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
                Funds have been released to the provider. You can now leave a
                review.
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.success,
                    shadowColor: colors.success,
                  },
                ]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Ionicons name="star-outline" size={18} color={colors.textInverse} />
                <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                  Leave a Review
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ================= FALLBACK =================
  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <BackHeader title="Booking" />
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary }}>Unknown status: {status}</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.primaryBtn,
              {
                marginTop: 20,
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: 20 },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },

  // ===== HEADER =====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    flex: 1,
  },
  placeholder: { width: 40 },

  // ===== CARD =====
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  // ===== ICON + BADGE =====
  iconWrap: { alignItems: "center", marginBottom: 14 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  // ===== TEXT =====
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  // ===== SERVICE BOX (provider pending) =====
  serviceBox: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    alignItems: "center",
  },
  serviceLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  serviceValue: {
    fontSize: 14.5,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  priceHero: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
  },

  // ===== BUTTONS =====
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    width: "100%",
    borderWidth: 1,
    marginTop: 12,
  },
  outlineBtnText: {
    fontWeight: "700",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },

  // ===== REQUEST ACTIONS (provider pending) =====
  requestActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  acceptFill: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  rejectOutline: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.1,
  },

  // ===== POLLING HINT =====
  pollingHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  pollingText: {
    fontSize: 12.5,
    fontWeight: "500",
  },

  // ===== INVOICE =====
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    alignSelf: "stretch",
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    alignSelf: "stretch",
  },
  invoiceLabel: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  invoiceValue: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: 8,
    alignSelf: "stretch",
  },
  totalLabel: {
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // ===== REVIEW CTA ICON ALIGN =====
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    width: "100%",
    gap: 8,
  },
  reviewButtonText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
});