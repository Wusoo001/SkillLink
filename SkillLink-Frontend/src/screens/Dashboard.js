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
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext"; // ✅ import theme
import {
  getMyBookings,
  getWalletBalance,
  requestWithdrawal,
  markBookingCompleted,
  confirmBookingCompletion,
} from "../services/api";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  awaiting_payment: "Awaiting Payment",
  paid_in_escrow: "Escrow Funded",
};

// ------------------ Booking Card ------------------
const BookingCard = ({ booking, role, onPress, onStatusChange, colors }) => {
  const isClient = role === "client";
  const otherParty = isClient ? booking.provider : booking.client;
  const otherPartyName = otherParty?.name || "User";
  const [actionLoading, setActionLoading] = useState(false);

  const statusColor = colors.status[booking.status] || "#64748B";

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

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowColor: colors.shadowColor,
          shadowOpacity: colors.shadowOpacity,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
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
            {STATUS_LABELS[booking.status] || booking.status}
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
    </TouchableOpacity>
  );
};

// ------------------ Main Dashboard ------------------
export default function Dashboard({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors, toggleTheme, theme } = useTheme(); // ✅ use theme
  const [activeTab, setActiveTab] = useState("client");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // ... all existing fetch functions (unchanged) ...
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
        {/* Header with theme toggle */}
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
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons
              name={theme === "light" ? "moon-outline" : "sunny-outline"}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
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
                colors={colors}
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

      {/* Withdrawal Modal */}
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
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.gray }]}
                onPress={() => setWithdrawModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
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
    </SafeAreaView>
  );
}

// ------------------ Styles (keep static values, colors will be overridden) ------------------
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
    shadowColor: "#000",
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
  themeToggle: { padding: 8 },
  placeholder: { width: 40 },
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
  walletActions: { flexDirection: "row", gap: 12, width: "100%", justifyContent: "center" },
  withdrawButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 40, flex: 1, alignItems: "center" },
  withdrawText: { fontWeight: "600", fontSize: 14 },
  bankButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 40, flex: 1, alignItems: "center" },
  bankButtonText: { fontWeight: "600", fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  tabContainer: { flexDirection: "row", borderRadius: 40, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 36, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  listContent: { paddingBottom: 40, gap: 16 },
  card: { borderRadius: 24, padding: 18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3, marginBottom: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
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
  actionButton: { paddingVertical: 10, borderRadius: 40, alignItems: "center", marginTop: 12 },
  actionButtonText: { fontWeight: "600", fontSize: 14 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  skeletonContainer: { gap: 16 },
  skeletonCard: { borderRadius: 24, padding: 18, marginBottom: 4 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 12 },
  skeletonLine: { height: 14, borderRadius: 8, marginVertical: 6, width: "80%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { borderRadius: 28, padding: 24, width: "85%", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  modalInput: { width: "100%", borderRadius: 16, padding: 14, fontSize: 16, marginBottom: 24, borderWidth: 1 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 40, alignItems: "center" },
  cancelButton: { /* bg set dynamically */ },
  confirmButton: { /* bg set dynamically */ },
  cancelButtonText: { fontWeight: "600" },
  confirmButtonText: { fontWeight: "600" },
});