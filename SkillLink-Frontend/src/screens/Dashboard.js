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
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import {
  getMyBookings,
  getWalletBalance,
  requestWithdrawal,
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
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
  released: "Released",
  in_progress: "In Progress",
};

// ------------------ Notification Item Component ------------------
const NotificationItem = ({ notification, onPress, colors }) => {
  const getIcon = (type) => {
    switch (type) {
      case "booking_request":
        return "calendar-outline";
      case "booking_accepted":
        return "checkmark-circle-outline";
      case "booking_rejected":
        return "close-circle-outline";
      case "booking_cancelled":
        return "ban-outline";
      case "payment_received":
        return "cash-outline";
      case "funds_released":
        return "wallet-outline";
      default:
        return "notifications-outline";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "booking_request":
        return colors.primary;
      case "booking_accepted":
        return colors.success;
      case "booking_rejected":
        return colors.danger;
      case "booking_cancelled":
        return colors.warning;
      case "payment_received":
        return colors.success;
      case "funds_released":
        return colors.primary;
      default:
        return colors.textTertiary;
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
        <Ionicons
          name={getIcon(notification.type)}
          size={24}
          color={getIconColor(notification.type)}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
          {notification.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
          {notification.message}
        </Text>
        <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
          {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

// ------------------ Booking Card ------------------
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
}) => {
  const isClient = role === "client";
  const otherParty = isClient ? booking.provider : booking.client;
  const otherPartyName = otherParty?.name || "User";
  const [actionLoading, setActionLoading] = useState(false);
  const statusColor = colors.status?.[booking.status] || "#64748B";

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

  const handleConfirmCompletion = async () => {
    setActionLoading(true);
    try {
      await confirmBookingCompletion(booking._id);
      Alert.alert("Success", "Job confirmed! Funds have been released to the provider.");
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
      if (window.confirm(confirmMessage)) {
        onConfirm();
      }
    } else {
      Alert.alert(
        "Accept Request",
        confirmMessage,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Accept", onPress: onConfirm },
        ]
      );
    }
  };

  const handleReject = () => {
    const confirmMessage = "Do you want to decline this booking request?";
    const onConfirm = () => {
      setActionLoading(true);
      onReject(booking._id);
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        onConfirm();
      }
    } else {
      Alert.alert(
        "Decline Request",
        confirmMessage,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Decline", style: "destructive", onPress: onConfirm },
        ]
      );
    }
  };

  const handleCancel = () => {
    const confirmMessage = "Are you sure you want to cancel this request?";
    const onConfirm = () => {
      setActionLoading(true);
      onCancel(booking._id);
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        onConfirm();
      }
    } else {
      Alert.alert(
        "Cancel Request",
        confirmMessage,
        [
          { text: "No", style: "cancel" },
          { text: "Yes", style: "destructive", onPress: onConfirm },
        ]
      );
    }
  };

  const isExpired = booking.isExpired === true;

  const handleReviewPress = () => {
    if (onPress) onPress(booking, "review");
  };

  const handlePayPress = () => {
    if (onPayPress) onPayPress(booking);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowColor: colors.shadowColor,
          shadowOpacity: colors.shadowOpacity,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          if (onPress) onPress(booking);
        }}
        activeOpacity={0.7}
        disabled={booking.status === "pending_acceptance"}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {otherPartyName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
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
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isExpired ? "Expired" : (STATUS_LABELS[booking.status] || booking.status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.serviceTitle, { color: colors.textPrimary }]}>
          {booking.serviceTitle}
        </Text>
        <Text style={[styles.price, { color: colors.primary }]}>
          ₦{booking.price?.toLocaleString()}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {new Date(booking.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>

      {/* Action Buttons */}
      {!isClient && booking.status === "pending_acceptance" && !isExpired && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.success }]}
            onPress={handleAccept}
            disabled={actionLoading}
          >
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
              {actionLoading ? "..." : "Accept"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: colors.danger }]}
            onPress={handleReject}
            disabled={actionLoading}
          >
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
              {actionLoading ? "..." : "Decline"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isClient && booking.status === "pending_acceptance" && !isExpired && (
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.danger }]}
          onPress={handleCancel}
          disabled={actionLoading}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textInverse }]}>
            {actionLoading ? "Cancelling..." : "Cancel Request"}
          </Text>
        </TouchableOpacity>
      )}

      {!isClient && booking.status === "paid_in_escrow" && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleMarkCompleted}
          disabled={actionLoading}
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
        >
          <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
            {actionLoading ? "Processing..." : "Confirm Completion"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Pay Now Button */}
      {isClient && booking.status === "accepted" && !isExpired && (
        <TouchableOpacity
          style={[styles.payNowButton, { backgroundColor: colors.success }]}
          onPress={handlePayPress}
          activeOpacity={0.7}
        >
          <Ionicons name="wallet-outline" size={18} color={colors.textInverse} />
          <Text style={[styles.payNowButtonText, { color: colors.textInverse }]}>
            Pay Now
          </Text>
        </TouchableOpacity>
      )}

      {/* Review button */}
      {isClient && booking.status === "released" && !booking.reviewed && (
        <TouchableOpacity
          style={[styles.reviewButton, { backgroundColor: colors.success }]}
          onPress={handleReviewPress}
          activeOpacity={0.7}
        >
          <Ionicons name="star-outline" size={18} color={colors.textInverse} />
          <Text style={[styles.reviewButtonText, { color: colors.textInverse }]}>
            Leave Review
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ------------------ Main Dashboard ------------------
export default function Dashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors, toggleTheme, theme } = useTheme();
  const [activeTab, setActiveTab] = useState("client");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationHasMore, setNotificationHasMore] = useState(false);

  // Review modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Fetch notifications
  const fetchNotifications = async (page = 1, append = false) => {
    setNotificationsLoading(true);
    try {
      const res = await getNotifications(page, 20);
      if (res.success) {
        if (append) {
          setNotifications((prev) => [...prev, ...res.data]);
        } else {
          setNotifications(res.data);
        }
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
      if (res.success) {
        setUnreadCount(res.count);
      }
    } catch (error) {
      console.log("Unread count error:", error);
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markNotificationRead(notification._id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      // Update local notification state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );
    }

    // Navigate based on notification type
    if (notification.data?.bookingId) {
      setNotificationModalVisible(false);
      navigation.navigate("BookingScreen", {
        bookingId: notification.data.bookingId,
        mode: "existing",
      });
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

  // Fetch bookings
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

  const fetchWalletBalance = async () => {
    try {
      const res = await getWalletBalance();
      setWalletBalance(res.balance || 0);
    } catch (error) {
      console.log("Wallet balance error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      fetchWalletBalance();
      fetchUnreadCount();
      if (notificationModalVisible) {
        fetchNotifications(1, false);
      }
    }, [notificationModalVisible])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
    fetchWalletBalance();
    fetchUnreadCount();
  };

  const handleAccept = async (bookingId) => {
    setBookings((prev) =>
      prev.map((b) =>
        b._id === bookingId ? { ...b, status: "accepted" } : b
      )
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
      prev.map((b) =>
        b._id === bookingId ? { ...b, status: "rejected" } : b
      )
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
    console.log("💳 [Dashboard] Pay Now clicked for booking:", booking._id);
    navigation.navigate("PaymentScreen", {
      bookingId: booking._id,
      amount: booking.price,
      serviceTitle: booking.serviceTitle,
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

  const openWithdrawModal = () => {
    setWithdrawAmount("");
    setWithdrawModalVisible(true);
  };

  const submitWithdraw = async () => {
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0");
      return;
    }
    if (amountNum > walletBalance) {
      Alert.alert("Insufficient Balance", "You cannot withdraw more than your balance");
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await requestWithdrawal(amountNum);
      Alert.alert("Success", res.message || "Withdrawal request submitted");
      setWithdrawModalVisible(false);
      setWithdrawAmount("");
      fetchWalletBalance();
    } catch (error) {
      const msg = error.response?.data?.message || "";
      if (msg.toLowerCase().includes("bank account") || msg.toLowerCase().includes("bank details")) {
        Alert.alert(
          "Bank Account Required",
          "Please set up your bank account before withdrawing.",
          [
            { text: "Set Up", onPress: () => navigation.navigate("BankSetup") },
            { text: "Cancel" },
          ]
        );
      } else {
        Alert.alert("Error", msg || "Withdrawal failed");
      }
    } finally {
      setWithdrawLoading(false);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        No bookings yet
      </Text>
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
        <View key={idx} style={[styles.skeletonCard, { backgroundColor: colors.card }]}>
          <View style={[styles.skeletonAvatar, { backgroundColor: colors.inputBackground }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.inputBackground }]} />
          <View style={[styles.skeletonLine, { width: "60%", backgroundColor: colors.inputBackground }]} />
        </View>
      ))}
    </View>
  );

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with Notification Bell */}
        <View style={styles.header}>
          {canGoBack && (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text
            style={[
              styles.headerTitle,
              !canGoBack && styles.headerTitleCentered,
              { color: colors.textPrimary },
            ]}
          >
            Dashboard
          </Text>
          <View style={styles.headerRight}>
            {/* Notification Bell */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={() => {
                setNotificationModalVisible(true);
                fetchNotifications(1, false);
                fetchUnreadCount();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={[styles.badgeText, { color: colors.textInverse }]}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Theme Toggle */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons
                name={theme === "light" ? "moon-outline" : "sunny-outline"}
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Card */}
        <View
          style={[
            styles.walletCard,
            {
              backgroundColor: colors.card,
              shadowColor: colors.shadowColor,
              shadowOpacity: colors.shadowOpacity,
            },
          ]}
        >
          <Text style={[styles.walletTitle, { color: colors.textTertiary }]}>
            Wallet Balance
          </Text>
          <Text style={[styles.walletBalance, { color: colors.primary }]}>
            ₦{walletBalance.toLocaleString()}
          </Text>
          <View style={styles.walletActions}>
            <TouchableOpacity
              style={[styles.withdrawButton, { backgroundColor: colors.primary }]}
              onPress={openWithdrawModal}
            >
              <Text style={[styles.withdrawText, { color: colors.textInverse }]}>
                Withdraw
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bankButton, { backgroundColor: colors.success }]}
              onPress={() => navigation.navigate("BankSetup")}
            >
              <Text style={[styles.bankButtonText, { color: colors.textInverse }]}>
                Bank Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Recent Bookings
        </Text>

        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "client" && {
                backgroundColor: colors.background,
                shadowColor: colors.shadowColor,
                shadowOpacity: colors.shadowOpacity,
              },
            ]}
            onPress={() => setActiveTab("client")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "client" && { color: colors.primary },
                { color: activeTab === "client" ? colors.primary : colors.textTertiary },
              ]}
            >
              Bookings I made
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "worker" && {
                backgroundColor: colors.background,
                shadowColor: colors.shadowColor,
                shadowOpacity: colors.shadowOpacity,
              },
            ]}
            onPress={() => setActiveTab("worker")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "worker" && { color: colors.primary },
                { color: activeTab === "worker" ? colors.primary : colors.textTertiary },
              ]}
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
                onStatusChange={() => {
                  fetchBookings();
                  fetchWalletBalance();
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

      {/* Withdrawal Modal (unchanged) */}
      <Modal
        visible={withdrawModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Withdraw Funds
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              Available balance: ₦{walletBalance.toLocaleString()}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Enter amount"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButtonModal, { backgroundColor: colors.gray || "#E2E8F0" }]}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={[styles.cancelButtonTextModal, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={submitWithdraw}
                disabled={withdrawLoading}
              >
                <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>
                  {withdrawLoading ? "Processing..." : "Withdraw"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.notificationModalHeader}>
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
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {notifications.length === 0 && !notificationsLoading ? (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
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

      {/* Review Modal (unchanged) */}
      <Modal
        visible={reviewModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Leave a Review
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              How was your experience with {reviewBooking?.provider?.name || "the provider"}?
            </Text>

            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= reviewRating ? "star" : "star-outline"}
                    size={40}
                    color={star <= reviewRating ? colors.warning : colors.textTertiary}
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
                style={[styles.modalButton, styles.cancelButtonModal, { backgroundColor: colors.gray || "#E2E8F0" }]}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={[styles.cancelButtonTextModal, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={submitReviewHandler}
                disabled={reviewSubmitting}
              >
                <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ========================================
// Styles
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
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
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
  },
  headerTitleCentered: { textAlign: "center" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  walletCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    alignItems: "center",
  },
  walletTitle: { fontSize: 16, marginBottom: 8 },
  walletBalance: { fontSize: 36, fontWeight: "800", marginBottom: 16 },
  walletActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  withdrawButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 40,
    flex: 1,
    alignItems: "center",
  },
  withdrawText: { fontWeight: "600", fontSize: 14 },
  bankButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 40,
    flex: 1,
    alignItems: "center",
  },
  bankButtonText: { fontWeight: "600", fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 40,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 36, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  listContent: { paddingBottom: 40, gap: 16 },
  card: {
    borderRadius: 24,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 4,
  },
  cardTouchable: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontWeight: "bold" },
  userName: { fontSize: 16, fontWeight: "600" },
  roleLabel: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  serviceTitle: { fontSize: 16, fontWeight: "500", marginBottom: 6 },
  price: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  date: { fontSize: 13 },
  actionButton: {
    paddingVertical: 10,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 12,
  },
  actionButtonText: { fontWeight: "600", fontSize: 14 },
  requestActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 40,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 40,
    alignItems: "center",
  },
  cancelButton: {
    paddingVertical: 10,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 12,
  },
  cancelButtonText: { fontWeight: "600", fontSize: 14 },
  payNowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginTop: 10,
    gap: 6,
  },
  payNowButtonText: { fontWeight: "700", fontSize: 15 },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginTop: 10,
    gap: 6,
  },
  reviewButtonText: { fontWeight: "600", fontSize: 14 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  skeletonContainer: { gap: 16 },
  skeletonCard: { borderRadius: 24, padding: 18, marginBottom: 4 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 12 },
  skeletonLine: { height: 14, borderRadius: 8, marginVertical: 6, width: "80%" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: 28,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  modalInput: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 40, alignItems: "center" },
  cancelButtonModal: { backgroundColor: "#F1F5F9" },
  confirmButton: { backgroundColor: "#2563EB" },
  cancelButtonTextModal: { fontWeight: "600" },
  confirmButtonText: { fontWeight: "600" },
  ratingStars: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 16,
  },
  reviewRatingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  reviewInput: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    marginBottom: 24,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: "top",
  },
  // Notification Modal Styles
  notificationModalContainer: {
    borderRadius: 28,
    padding: 20,
    width: "92%",
    maxHeight: "80%",
  },
  notificationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  notificationModalActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  markAllReadText: {
    fontSize: 13,
    fontWeight: "600",
  },
  notificationList: {
    gap: 8,
    paddingBottom: 8,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyNotifications: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyNotificationsText: {
    fontSize: 16,
    marginTop: 12,
  },
  notificationLoader: {
    paddingVertical: 16,
  },
});