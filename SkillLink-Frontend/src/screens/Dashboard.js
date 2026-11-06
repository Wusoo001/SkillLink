import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { useFocusEffect,useRoute } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMyBookings,
  markBookingCompleted,
  confirmBookingCompletion,
  acceptBooking,
  rejectBooking,
  cancelBookingRequest,
  submitReview,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/api";

const STATUS_LABELS = {
  pending_acceptance: "Pending Request",
  accepted: "Accepted",
  rejected: "Rejected",
  awaiting_payment: "Awaiting Payment",
  paid_in_escrow: "Escrow Funded",
  in_progress: "In Progress",
  completed: "Completed",
  ready_for_release: "Ready for Release",
  released: "Released",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

// Chat is available in these statuses
const CHAT_ACTIVE_STATUSES = [
  "paid_in_escrow",
  "in_progress",
  "completed",
  "ready_for_release",
  "released",
];

// ================== Notification Item ==================
const NotificationItem = ({ notification, onPress, colors }) => {
  const getIcon = (type) => {
    switch (type) {
      case "booking_request": return "calendar-outline";
      case "booking_accepted": return "checkmark-circle-outline";
      case "booking_rejected": return "close-circle-outline";
      case "booking_cancelled": return "ban-outline";
      case "booking_completed": return "checkmark-done-outline";
      case "payment_received": return "cash-outline";
      case "funds_released": return "wallet-outline";
      case "chat_message": return "chatbubble-ellipses-outline";
      default: return "notifications-outline";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "booking_request": return colors.primary;
      case "booking_accepted": return colors.success;
      case "booking_rejected": return colors.danger;
      case "booking_cancelled": return colors.warning;
      case "booking_completed": return colors.success;
      case "payment_received": return colors.success;
      case "funds_released": return colors.primary;
      case "chat_message": return colors.primary;
      default: return colors.textTertiary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.read ? colors.card : colors.primaryLight + "30",
          borderColor: colors.inputBorder,
        },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIconContainer}>
        <Ionicons name={getIcon(notification.type)} size={22} color={getIconColor(notification.type)} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
          {new Date(notification.createdAt).toLocaleDateString()}{" "}
          {new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

// ================== Booking Card ==================
const BookingCard = ({
  booking,
  role,
  onPress,
  onStatusChange,
  colors,
  onAccept,
  onReject,
  onCancel,
  onPayPress,
  onChatPress,
  onRequireOtp,
}) => {
  const isClient = role === "client";
  const otherParty = isClient ? booking.provider : booking.client;
  const otherPartyName = otherParty?.name || "User";
  const [actionLoading, setActionLoading] = useState(false);
  const statusColor = colors.status?.[booking.status] || "#64748B";
  // ✅ Compute provider's net payout (uses actual data when available, else estimates)
  const getProviderEarnings = () => {
    const price = Number(booking.price) || 0;

    // Prefer actual numbers from Pandascrow webhook
    if (booking.payment?.pandascrowNetAmount != null) {
      return {
        exact: true,
        net: booking.payment.pandascrowNetAmount,
        platformFee: booking.payment.pandascrowPlatformFee ?? Math.round(price * 0.05),
        escrowFee: price - (booking.payment.pandascrowNetAmount + (booking.payment.pandascrowPlatformFee ?? 0)),
      };
    }

    // Fallback: estimate using known commission + estimated escrow fee
    const PLATFORM_FEE_PCT = 5;
    const ESCROW_FEE_PCT = 3;   // approximate — will be exact once paid
    const platformFee = Math.round(price * (PLATFORM_FEE_PCT / 100));
    const escrowFee = Math.round(price * (ESCROW_FEE_PCT / 100));
    return {
      exact: false,
      net: price - platformFee - escrowFee,
      platformFee,
      escrowFee,
    };
  };

  const handleMarkCompleted = async () => {
    setActionLoading(true);
    try {
      await markBookingCompleted(booking._id);
      Alert.alert("Success", "Job marked as completed. Waiting for client confirmation.");
      onStatusChange();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Simplified — delegates OTP prompt to parent Dashboard modal (works on Android/iOS/web)
  const handleConfirmCompletion = async () => {
    setActionLoading(true);
    try {
      const res = await confirmBookingCompletion(booking._id);

      if (res?.requires_otp) {
        // Backend wants OTP — open the modal (parent handles prompt + submit)
        setActionLoading(false);
        onRequireOtp(booking._id);
        return;
      }

      // Direct success path (no OTP needed)
      Alert.alert("Success", "Job confirmed.");
      onStatusChange();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () => {
    const confirmMessage = "Do you want to accept this booking request?";
    const onConfirm = () => {
      setActionLoading(true);
      onAccept(booking._id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) onConfirm();
    } else {
      Alert.alert("Accept Request", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: onConfirm },
      ]);
    }
  };

  const handleReject = () => {
    const confirmMessage = "Do you want to decline this booking request?";
    const onConfirm = () => {
      setActionLoading(true);
      onReject(booking._id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) onConfirm();
    } else {
      Alert.alert("Decline Request", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: "Decline", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  const handleCancel = () => {
    const confirmMessage = "Are you sure you want to cancel this request?";
    const onConfirm = () => {
      setActionLoading(true);
      onCancel(booking._id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) onConfirm();
    } else {
      Alert.alert("Cancel Request", confirmMessage, [
        { text: "No", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  const isExpired = booking.isExpired === true;
  const statusLabel = isExpired ? "Expired" : (STATUS_LABELS[booking.status] || booking.status);
  const canChat = CHAT_ACTIVE_STATUSES.includes(booking.status);

  const handleReviewPress = () => onPress && onPress(booking, "review");
  const handlePayPress = () => onPayPress && onPayPress(booking);
  const handleChatPress = () => onChatPress && onChatPress(booking, isClient ? "provider" : "client");

  return (
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
      <TouchableOpacity
        onPress={() => onPress && onPress(booking)}
        activeOpacity={0.85}
        disabled={booking.status === "pending_acceptance"}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {otherPartyName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userTextBlock}>
              <Text
                style={[styles.userName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {otherPartyName}
              </Text>
              <Text style={[styles.roleLabel, { color: colors.textTertiary }]}>
                {isClient ? "Provider" : "Client"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.serviceTitle, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {booking.serviceTitle}
        </Text>

        {booking.message && booking.message.trim() !== "" && (
          <View
            style={[
              styles.requestMessageBox,
              {
                backgroundColor: colors.inputBackground,
                borderLeftColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[styles.requestMessageText, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              "{booking.message}"
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.price, { color: colors.primary }]}>
            ₦{booking.price?.toLocaleString()}
          </Text>
          <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              {new Date(booking.scheduledDate || booking.createdAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {!isClient && (
        <View
          style={[
            styles.earningsBox,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Text
            style={[styles.earningsHeader, { color: colors.textTertiary }]}
          >
            YOUR EARNINGS
          </Text>

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>
              Client Pays
            </Text>
            <Text style={[styles.earningsValue, { color: colors.textPrimary }]}>
              ₦{Number(booking.price).toLocaleString()}
            </Text>
          </View>

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>
              Platform Fee
            </Text>
            <Text style={[styles.earningsValue, { color: colors.danger }]}>
              -₦{Math.round(getProviderEarnings().platformFee).toLocaleString()}
            </Text>
          </View>

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>
              Escrow Fee {!getProviderEarnings().exact && "(est.)"}
            </Text>
            <Text style={[styles.earningsValue, { color: colors.danger }]}>
              -₦{Math.round(getProviderEarnings().escrowFee).toLocaleString()}
            </Text>
          </View>

          <View
            style={[styles.earningsDivider, { backgroundColor: colors.inputBorder }]}
          />

          <View style={styles.earningsRow}>
            <Text style={[styles.earningsNetLabel, { color: colors.textPrimary }]}>
              You Receive
            </Text>
            <Text style={[styles.earningsNetValue, { color: colors.success }]}>
              {getProviderEarnings().exact ? "" : "~"}
              ₦{Math.round(getProviderEarnings().net).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Action area */}
      {!isClient && booking.status === "pending_acceptance" && !isExpired && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.success }]}
            onPress={handleAccept}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
              {actionLoading ? "..." : "Accept"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={handleReject}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              {actionLoading ? "..." : "Decline"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isClient && booking.status === "pending_acceptance" && !isExpired && (
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={handleCancel}
          disabled={actionLoading}
          activeOpacity={0.85}
        >
          <Text style={[styles.cancelButtonText, { color: colors.danger }]}>
            {actionLoading ? "Cancelling..." : "Cancel Request"}
          </Text>
        </TouchableOpacity>
      )}

      {!isClient && booking.status === "paid_in_escrow" && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleMarkCompleted}
          disabled={actionLoading}
          activeOpacity={0.85}
        >
          <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
            {actionLoading ? "Processing..." : "Mark as Completed"}
          </Text>
        </TouchableOpacity>
      )}

      {isClient && booking.status === "completed" && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleConfirmCompletion}
          disabled={actionLoading}
          activeOpacity={0.85}
        >
          <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
            {actionLoading ? "Processing..." : "Confirm Completion"}
          </Text>
        </TouchableOpacity>
      )}

      {isClient && booking.status === "accepted" && !isExpired && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={handlePayPress}
          activeOpacity={0.85}
        >
          <Ionicons name="wallet-outline" size={17} color={colors.textInverse} />
          <Text style={[styles.actionButtonText, { color: colors.textInverse, marginLeft: 6 }]}>
            Pay Now
          </Text>
        </TouchableOpacity>
      )}

      {isClient && booking.status === "released" && !booking.reviewed && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleReviewPress}
          activeOpacity={0.85}
        >
          <Ionicons name="star-outline" size={17} color={colors.textInverse} />
          <Text style={[styles.actionButtonText, { color: colors.textInverse, marginLeft: 6 }]}>
            Leave Review
          </Text>
        </TouchableOpacity>
      )}

      {canChat && (
        <TouchableOpacity
          style={[
            styles.chatButton,
            { backgroundColor: colors.card, borderColor: colors.primary },
          ]}
          onPress={handleChatPress}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
          <Text style={[styles.chatButtonText, { color: colors.primary }]}>
            Open Chat
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ================== Main Dashboard ==================
export default function Dashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors, toggleTheme, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute();

  const [activeTab, setActiveTab] = useState("client");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationHasMore, setNotificationHasMore] = useState(false);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ✅ OTP modal state — works on Android, iOS, and web
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpBookingId, setOtpBookingId] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
      // Clear param so it can trigger again next time
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params?.initialTab]);

  // ===== Notifications =====
  const fetchNotifications = async (page = 1, append = false) => {
    setNotificationsLoading(true);
    try {
      const res = await getNotifications(page, 20);
      if (res.success) {
        if (append) setNotifications((prev) => [...prev, ...res.data]);
        else setNotifications(res.data);
        setNotificationHasMore(res.pagination?.pages > page);
        setNotificationPage(page);
      }
    } catch (error) {
      console.log("Fetch notifications error:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadNotificationCount();
      if (res.success) setUnreadCount(res.count);
    } catch (error) {
      console.log("Unread count error:", error);
    }
  };

 const handleNotificationPress = async (notification) => {
  if (!notification.read) {
    await markNotificationRead(notification._id);
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) =>
      prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
    );
  }

  // Chat notifications → still go to Chat screen (unchanged)
  if (notification.type === "chat_message" && notification.data?.bookingId) {
    setNotificationModalVisible(false);
    navigation.navigate("Chat", {
      bookingId: notification.data.bookingId,
      otherPartyName: notification.title.replace("New message from ", ""),
      otherPartyImage: null,
    });
    return;
  }

  // Booking notifications → stay on Dashboard, switch to the correct tab
  if (notification.data?.bookingId) {
    setNotificationModalVisible(false);

    // Determine which tab this booking belongs to:
    // - If we're the client → "client" tab (Bookings I made)
    // - If we're the provider → "worker" tab (Bookings with me)
    const clientId = notification.data?.clientId;
    const providerId = notification.data?.providerId;
    const targetTab =
      String(clientId) === String(user?._id)
        ? "client"
        : String(providerId) === String(user?._id)
        ? "worker"
        : "client"; // safe fallback

    // We're already on Dashboard — just switch the tab (no navigation needed)
    setActiveTab(targetTab);
  }
};

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const loadMoreNotifications = () => {
    if (!notificationsLoading && notificationHasMore) {
      fetchNotifications(notificationPage + 1, true);
    }
  };

  // ===== Bookings =====
  const fetchBookings = async () => {
    try {
      const response = await getMyBookings();
      const sorted = (response.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setBookings(sorted);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.log("Fetch bookings error:", error);
      Alert.alert("Error", "Could not load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      fetchUnreadCount();
      if (notificationModalVisible) fetchNotifications(1, false);
    }, [notificationModalVisible])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
    fetchUnreadCount();
  };

  const handleAccept = async (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: "accepted" } : b))
    );
    setRefreshKey((prev) => prev + 1);
    try {
      await acceptBooking(bookingId);
      Alert.alert("Accepted", "Booking request accepted.");
      await fetchBookings();
      fetchUnreadCount();
    } catch (error) {
      await fetchBookings();
      Alert.alert("Error", "Could not accept booking.");
    }
  };

  const handleReject = async (bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status: "rejected" } : b))
    );
    setRefreshKey((prev) => prev + 1);
    try {
      await rejectBooking(bookingId);
      Alert.alert("Declined", "Booking request declined.");
      await fetchBookings();
      fetchUnreadCount();
    } catch (error) {
      await fetchBookings();
      Alert.alert("Error", "Could not decline booking.");
    }
  };

  const handleCancel = async (bookingId) => {
    setBookings((prev) => prev.filter((b) => b._id !== bookingId));
    setRefreshKey((prev) => prev + 1);
    try {
      await cancelBookingRequest(bookingId);
      Alert.alert("Cancelled", "Request cancelled successfully.");
      await fetchBookings();
      fetchUnreadCount();
    } catch (error) {
      await fetchBookings();
      Alert.alert("Error", "Could not cancel request.");
    }
  };

  const handlePayNow = (booking) => {
    navigation.navigate("PaymentScreen", {
      bookingId: booking._id,
      amount: booking.price,
      serviceTitle: booking.serviceTitle,
    });
  };

  // ✅ Open OTP modal when backend signals it's required
  const handleRequireOtp = (bookingId) => {
    setOtpBookingId(bookingId);
    setOtpValue("");
    setOtpError("");
    setOtpSubmitting(false);
    setOtpModalVisible(true);
  };

  // ✅ Submit OTP to release funds
  const handleSubmitOtp = async () => {
    const trimmed = otpValue.trim();
    if (!trimmed) {
      setOtpError("Please enter the OTP from your email.");
      return;
    }

    setOtpSubmitting(true);
    setOtpError("");

    try {
      const result = await confirmBookingCompletion(otpBookingId, trimmed);
      if (result?.success) {
        setOtpModalVisible(false);
        setOtpBookingId(null);
        setOtpValue("");
        Alert.alert("Success", "Funds released to provider.");
        fetchBookings();
      } else {
        setOtpError(result?.message || "OTP verification failed. Try again.");
      }
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "OTP verification failed. Try again."
      );
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleChatPress = (booking, otherRole) => {
    const otherParty = otherRole === "provider" ? booking.provider : booking.client;
    navigation.navigate("Chat", {
      bookingId: booking._id,
      otherPartyName: otherParty?.name || "User",
      otherPartyImage: otherParty?.profileImage || null,
    });
  };

  const handleBookingPress = (booking, mode) => {
    if (mode === "review") {
      setReviewBooking(booking);
      setReviewRating(5);
      setReviewComment("");
      setReviewModalVisible(true);
      return;
    }
    if (activeTab === "client") {
      navigation.navigate("BookingScreen", {
        bookingId: booking._id,
        mode: "existing",
      });
    } else {
      Alert.alert(
        "Booking Details",
        `Service: ${booking.serviceTitle}\nStatus: ${booking.status}\nPrice: ₦${booking.price}`
      );
    }
  };

  const submitReviewHandler = async () => {
    if (!reviewBooking) return;
    setReviewSubmitting(true);
    try {
      await submitReview(reviewBooking._id, reviewRating, reviewComment);
      Alert.alert("Success", "Review posted! Thank you for your feedback.");
      setReviewModalVisible(false);
      fetchBookings();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to submit review";
      Alert.alert("Error", msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === "client") return booking.client?._id === user?._id;
    return booking.provider?._id === user?._id;
  });

  // ✅ Earnings — computed from provider-side released bookings
  const totalEarnings = bookings
    .filter(
      (b) => b.provider?._id === user?._id && b.status === "released"
    )
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const pendingEarnings = bookings
    .filter(
      (b) =>
        b.provider?._id === user?._id &&
        ["paid_in_escrow", "completed"].includes(b.status)
    )
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="calendar-outline" size={26} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No bookings yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {activeTab === "client"
          ? "Book a service to get started"
          : "Wait for clients to book your services"}
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2].map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <View style={styles.skeletonHeader}>
            <View style={[styles.skeletonAvatar, { backgroundColor: colors.inputBackground }]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={[styles.skeletonLine, { backgroundColor: colors.inputBackground }]} />
              <View style={[styles.skeletonLineShort, { backgroundColor: colors.inputBackground }]} />
            </View>
          </View>
          <View style={[styles.skeletonBodyLine, { backgroundColor: colors.inputBackground }]} />
        </View>
      ))}
    </View>
  );

  const canGoBack = navigation.canGoBack();

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <View style={styles.header}>
          {canGoBack && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text
            style={[
              styles.headerTitle,
              !canGoBack && styles.headerTitleCentered,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            Dashboard
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
              onPress={() => {
                setNotificationModalVisible(true);
                fetchNotifications(1, false);
                fetchUnreadCount();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.card }]}>
                  <Text style={[styles.badgeText, { color: colors.textInverse }]}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons
                name={theme === "light" ? "moon-outline" : "sunny-outline"}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== EARNINGS CARD (replaces wallet) ===== */}
        <View
          style={[
            styles.walletCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.inputBorder,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <View style={styles.walletTop}>
            <View style={styles.walletLeft}>
              <Text style={[styles.walletTitle, { color: colors.textTertiary }]}>
                Total Earnings
              </Text>
              <Text
                style={[styles.walletBalance, { color: colors.textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ₦{totalEarnings.toLocaleString()}
              </Text>
              {pendingEarnings > 0 && (
                <Text style={[styles.walletPending, { color: colors.textTertiary }]}>
                  ₦{pendingEarnings.toLocaleString()} in escrow
                </Text>
              )}
            </View>
            <View style={[styles.walletIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="trending-up" size={22} color={colors.primary} />
            </View>
          </View>

          <View style={[styles.walletDivider, { backgroundColor: colors.inputBorder }]} />

          <View style={styles.walletActions}>
            <TouchableOpacity
              style={[
                styles.walletButton,
                styles.walletButtonOutline,
                { backgroundColor: colors.card, borderColor: colors.success },
              ]}
              onPress={() => navigation.navigate("BankSetup")}
              activeOpacity={0.85}
            >
              <Ionicons name="card-outline" size={16} color={colors.success} />
              <Text style={[styles.walletButtonText, { color: colors.success }]}>
                Manage Bank Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Bookings
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
            {filteredBookings.length}
          </Text>
        </View>

        <View
          style={[
            styles.segmentContainer,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === "client" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab("client")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === "client" ? colors.textInverse : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              Bookings I made
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === "worker" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab("worker")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === "worker" ? colors.textInverse : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              Bookings with me
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          renderSkeleton()
        ) : (
          <FlatList
            key={refreshKey}
            data={filteredBookings}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                role={activeTab}
                onPress={handleBookingPress}
                onPayPress={handlePayNow}
                onChatPress={handleChatPress}
                onRequireOtp={handleRequireOtp}
                onStatusChange={() => {
                  fetchBookings();
                }}
                colors={colors}
                onAccept={handleAccept}
                onReject={handleReject}
                onCancel={handleCancel}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ===== OTP MODAL ===== */}
      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!otpSubmitting) {
            setOtpModalVisible(false);
            setOtpBookingId(null);
            setOtpValue("");
            setOtpError("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.otpIconWrap,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Enter Release OTP
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              Pandascrow sent a 6-digit code to your email. Enter it to release
              funds to the provider.
            </Text>

            <TextInput
              style={[
                styles.otpInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: otpError ? colors.danger : colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={otpValue}
              onChangeText={(t) => {
                setOtpValue(t);
                if (otpError) setOtpError("");
              }}
              placeholder="Enter OTP"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              autoFocus
              editable={!otpSubmitting}
              maxLength={10}
            />

            {otpError ? (
              <View
                style={[
                  styles.otpErrorBox,
                  {
                    backgroundColor: colors.danger + "12",
                    borderColor: colors.danger + "40",
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={[styles.otpErrorText, { color: colors.danger }]}>
                  {otpError}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtpBookingId(null);
                  setOtpValue("");
                  setOtpError("");
                }}
                disabled={otpSubmitting}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: otpSubmitting ? 0.7 : 1,
                  },
                ]}
                onPress={handleSubmitOtp}
                disabled={otpSubmitting}
              >
                {otpSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.textInverse }]}>
                    Verify & Release
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== NOTIFICATION MODAL ===== */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationModalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.notificationModalHeader, { borderBottomColor: colors.inputBorder }]}>
              <Text style={[styles.notificationModalTitle, { color: colors.textPrimary }]}>
                Notifications
              </Text>
              <View style={styles.notificationModalActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                    <Text style={[styles.markAllReadText, { color: colors.primary }]}>
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setNotificationModalVisible(false)}
                  style={{ marginLeft: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {notifications.length === 0 && !notificationsLoading ? (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={44} color={colors.textTertiary} />
                <Text style={[styles.emptyNotificationsText, { color: colors.textTertiary }]}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <NotificationItem
                    notification={item}
                    onPress={handleNotificationPress}
                    colors={colors}
                  />
                )}
                contentContainerStyle={styles.notificationList}
                onEndReached={loadMoreNotifications}
                onEndReachedThreshold={0.2}
                ListFooterComponent={
                  notificationsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.notificationLoader} />
                  ) : null
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ===== REVIEW MODAL ===== */}
      <Modal
        visible={reviewModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Leave a Review</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              How was your experience with {reviewBooking?.provider?.name || "the provider"}?
            </Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= reviewRating ? "star" : "star-outline"}
                    size={38}
                    color={star <= reviewRating ? "#F59E0B" : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.reviewRatingLabel, { color: colors.textSecondary }]}>
              {reviewRating} / 5 stars
            </Text>
            <TextInput
              style={[
                styles.reviewInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Write your review (optional)"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.inputBackground }]}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={submitReviewHandler}
                disabled={reviewSubmitting}
              >
                <Text style={[styles.modalButtonText, { color: colors.textInverse }]}>
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 18 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
  },
  headerTitleCentered: { textAlign: "left" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 9.5, fontWeight: "800" },

  walletCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  walletTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  walletLeft: { flex: 1, paddingRight: 12 },
  walletTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  walletPending: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 4,
  },
  walletIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  walletDivider: { height: 1, marginBottom: 14 },
  walletActions: { flexDirection: "row", gap: 10 },
  walletButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  walletButtonOutline: { borderWidth: 1.5 },
  walletButtonText: { fontWeight: "700", fontSize: 13.5, letterSpacing: 0.1 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 22,
    textAlign: "right",
  },

  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 13, fontWeight: "700", letterSpacing: -0.1 },

  listContent: { paddingBottom: 110, paddingTop: 2 },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTouchable: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  userTextBlock: { flex: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "700" },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  roleLabel: { fontSize: 11.5, fontWeight: "500" },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: 130,
  },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.1 },

  serviceTitle: {
    fontSize: 14.5,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  date: { fontSize: 12.5, fontWeight: "500" },

  actionButton: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  actionButtonText: { fontWeight: "700", fontSize: 13.5, letterSpacing: 0.1 },

  requestActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButton: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  cancelButtonText: { fontWeight: "700", fontSize: 13.5 },

  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  chatButtonText: {
    fontWeight: "700",
    fontSize: 13.5,
  },

  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center", maxWidth: 260, lineHeight: 18 },

  skeletonContainer: { gap: 12 },
  skeletonCard: { borderRadius: 20, borderWidth: 1, padding: 14 },
  skeletonHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21 },
  skeletonLine: { height: 12, borderRadius: 6, marginBottom: 6, width: "60%" },
  skeletonLineShort: { height: 10, borderRadius: 5, width: "35%" },
  skeletonBodyLine: { height: 12, borderRadius: 6, width: "80%" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: 24,
    padding: 20,
    width: "88%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 19, fontWeight: "800", marginBottom: 6 },
  modalSubtitle: { fontSize: 13.5, marginBottom: 18, textAlign: "center" },
  modalInput: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
  },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  modalButtonText: { fontWeight: "700", fontSize: 14 },

  ratingStars: { flexDirection: "row", gap: 6, marginVertical: 14 },
  reviewRatingLabel: { fontSize: 15, fontWeight: "700", marginBottom: 14 },
  reviewInput: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    fontSize: 14.5,
    marginBottom: 20,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: "top",
  },

  notificationModalContainer: {
    borderRadius: 24,
    padding: 18,
    width: "92%",
    maxHeight: "80%",
  },
  notificationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  notificationModalTitle: { fontSize: 18, fontWeight: "800" },
  notificationModalActions: { flexDirection: "row", alignItems: "center" },
  markAllReadText: { fontSize: 12.5, fontWeight: "700" },
  notificationList: { gap: 8, paddingBottom: 8 },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  notificationIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    marginRight: 10,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  notificationMessage: { fontSize: 13, marginBottom: 2, lineHeight: 18 },
  notificationTime: { fontSize: 11.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  emptyNotifications: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyNotificationsText: { fontSize: 14.5, marginTop: 12 },
  notificationLoader: { paddingVertical: 14 },
  requestMessageBox: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  requestMessageText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  // ✅ Provider earnings box
  earningsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  earningsHeader: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  earningsLabel: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  earningsValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  earningsDivider: {
    height: 1,
    marginVertical: 6,
  },
  earningsNetLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  earningsNetValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ✅ OTP modal styles
  otpIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  otpInput: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 12,
  },
  otpErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  otpErrorText: {
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
  },
});