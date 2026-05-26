import React, { useState, useEffect, useCallback, useContext } from "react";
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import {
  getMyBookings,
  getWalletBalance,
  requestWithdrawal,
  markBookingCompleted,      // ✅ new
  confirmBookingCompletion,  // ✅ new
} from "../services/api";

// Status color mapping (supports your backend statuses)
const STATUS_COLORS = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  completed: "#10B981",
  cancelled: "#EF4444",
  awaiting_payment: "#F59E0B",
  paid_in_escrow: "#10B981",
};

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  awaiting_payment: "Awaiting Payment",
  paid_in_escrow: "Escrow Funded",
};

// ------------------ Booking Card Component (with actions) ------------------
const BookingCard = ({ booking, role, onPress, onStatusChange }) => {
  const isClient = role === "client";
  const otherParty = isClient ? booking.provider : booking.client;
  const otherPartyName = otherParty?.name || "User";
  const [actionLoading, setActionLoading] = useState(false);

  const handleMarkCompleted = async () => {
    setActionLoading(true);
    try {
      await markBookingCompleted(booking._id);
      Alert.alert("Success", "Job marked as completed. Waiting for client confirmation.");
      onStatusChange(); // refresh list
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
      onStatusChange(); // refresh list
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{otherPartyName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{otherPartyName}</Text>
            <Text style={styles.roleLabel}>{isClient ? "Provider" : "Client"}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: (STATUS_COLORS[booking.status] || "#94A3B8") + "15" },
          ]}
        >
          <Text style={[styles.statusText, { color: STATUS_COLORS[booking.status] || "#64748B" }]}>
            {STATUS_LABELS[booking.status] || booking.status}
          </Text>
        </View>
      </View>

      <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
      <Text style={styles.price}>₦{booking.price?.toLocaleString()}</Text>
      <Text style={styles.date}>
        {new Date(booking.createdAt).toLocaleDateString()}
      </Text>

      {/* Action Buttons */}
      {!isClient && booking.status === "paid_in_escrow" && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMarkCompleted}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>
            {actionLoading ? "Processing..." : "Mark as Completed"}
          </Text>
        </TouchableOpacity>
      )}

      {isClient && booking.status === "completed" && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleConfirmCompletion}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>
            {actionLoading ? "Processing..." : "Confirm Completion"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ------------------ Main Dashboard Component ------------------
export default function Dashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("client");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Fetch bookings from backend
  const fetchBookings = async () => {
    try {
      const response = await getMyBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.log("Fetch bookings error:", error);
      Alert.alert("Error", "Could not load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch real wallet balance
  const fetchWalletBalance = async () => {
    try {
      const res = await getWalletBalance();
      setWalletBalance(res.balance || 0);
    } catch (error) {
      console.log("Wallet balance error:", error);
    }
  };

  // Refresh both data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      fetchWalletBalance();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
    fetchWalletBalance();
  };

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === "client") return booking.client?._id === user?._id;
    return booking.provider?._id === user?._id;
  });

  // Withdrawal logic
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
      fetchWalletBalance(); // refresh balance after withdrawal
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "client"
          ? "Book a service to get started"
          : "Wait for clients to book your services"}
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2].map((_, idx) => (
        <View key={idx} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "60%" }]} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Dashboard</Text>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <Text style={styles.walletTitle}>Wallet Balance</Text>
          <Text style={styles.walletBalance}>₦{walletBalance.toLocaleString()}</Text>
          <TouchableOpacity style={styles.withdrawButton} onPress={openWithdrawModal}>
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Bookings Section */}
        <Text style={styles.sectionTitle}>Recent Bookings</Text>

        {/* Segmented Control */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "client" && styles.activeTab]}
            onPress={() => setActiveTab("client")}
          >
            <Text style={[styles.tabText, activeTab === "client" && styles.activeTabText]}>
              Bookings I made
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "worker" && styles.activeTab]}
            onPress={() => setActiveTab("worker")}
          >
            <Text style={[styles.tabText, activeTab === "worker" && styles.activeTabText]}>
              Bookings with me
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                role={activeTab}
                onPress={() =>
                  navigation.navigate("PaymentDashboard", { bookingId: item._id })
                }
                onStatusChange={() => {
                  fetchBookings();
                  fetchWalletBalance();
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Withdrawal Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <Text style={styles.modalSubtitle}>
              Available balance: ₦{walletBalance.toLocaleString()}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={submitWithdraw}
                disabled={withdrawLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {withdrawLoading ? "Processing..." : "Withdraw"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ------------------ Styles (unchanged, but actionButton added) ------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginBottom: 20, letterSpacing: -0.5 },
  walletCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, alignItems: "center" },
  walletTitle: { fontSize: 16, color: "#64748B", marginBottom: 8 },
  walletBalance: { fontSize: 36, fontWeight: "800", color: "#2563EB", marginBottom: 16 },
  withdrawButton: { backgroundColor: "#2563EB", paddingVertical: 10, paddingHorizontal: 24, borderRadius: 40 },
  withdrawText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  tabContainer: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 40, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 36, alignItems: "center" },
  activeTab: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  activeTabText: { color: "#2563EB" },
  listContent: { paddingBottom: 40, gap: 16 },
  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginBottom: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  userName: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  roleLabel: { fontSize: 12, color: "#64748B" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  serviceTitle: { fontSize: 16, fontWeight: "500", color: "#1E293B", marginBottom: 6 },
  price: { fontSize: 18, fontWeight: "700", color: "#2563EB", marginBottom: 4 },
  date: { fontSize: 13, color: "#94A3B8" },
  actionButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 12,
  },
  actionButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1E293B", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center" },
  skeletonContainer: { gap: 16 },
  skeletonCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, marginBottom: 4 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E2E8F0", marginBottom: 12 },
  skeletonLine: { height: 14, backgroundColor: "#E2E8F0", borderRadius: 8, marginVertical: 6, width: "80%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#FFF", borderRadius: 28, padding: 24, width: "85%", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  modalInput: { width: "100%", backgroundColor: "#F1F5F9", borderRadius: 16, padding: 14, fontSize: 16, marginBottom: 24 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 40, alignItems: "center" },
  cancelButton: { backgroundColor: "#F1F5F9" },
  confirmButton: { backgroundColor: "#2563EB" },
  cancelButtonText: { color: "#475569", fontWeight: "600" },
  confirmButtonText: { color: "#FFF", fontWeight: "600" },
});