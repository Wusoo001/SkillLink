import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";

const BankSetupScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [banks, setBanks] = useState([]);
  const [selectedBankName, setSelectedBankName] = useState("");
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDetails, setSavedDetails] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBanks();
    fetchSavedDetails();
  }, []);

  // ================= API CALLS (unchanged) =================
  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bank/banks");
      if (res.data.status) setBanks(res.data.data);
    } catch (error) {
      Alert.alert("Error", "Failed to load banks");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedDetails = async () => {
    try {
      const res = await api.get("/bank/details");
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setSavedDetails(data);
        setAccountNumber(data.accountNumber || "");
        setSelectedBankName(data.bankName || "");
        setSelectedBankCode(data.bankCode || "");
        setAccountName(data.accountName || "");
      }
    } catch (error) {}
  };

  const verifyAccount = async () => {
    if (!accountNumber || accountNumber.length < 10) {
      Alert.alert("Error", "Enter a valid account number");
      return;
    }
    if (!selectedBankCode) {
      Alert.alert("Error", "Select a bank");
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post("/bank/resolve", {
        accountNumber,
        bankCode: selectedBankCode,
      });
      if (res.data.status) {
        setAccountName(res.data.data.account_name);
        Alert.alert("Verified", `Account name: ${res.data.data.account_name}`);
      } else {
        Alert.alert("Error", res.data.message || "Account not found");
      }
    } catch (error) {
      Alert.alert("Error", "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const saveBankDetails = async () => {
    if (!accountName || !accountNumber || !selectedBankCode) {
      Alert.alert("Error", "Please verify your account first");
      return;
    }
    setSaving(true);
    try {
      await api.post("/bank/save", {
        bankName: selectedBankName,
        bankCode: selectedBankCode,
        accountNumber,
        accountName,
      });
      Alert.alert("Success", "Bank details saved");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ================= FILTER =================
  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ================= BANK ITEM =================
  const renderBankItem = ({ item }) => {
    const key = item.code ? item.code.toString() : `bank_${Math.random()}`;
    const isSelected = selectedBankCode === item.code;
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.bankItem,
          { borderBottomColor: colors.inputBorder },
        ]}
        onPress={() => {
          setSelectedBankCode(item.code);
          setSelectedBankName(item.name);
          setModalVisible(false);
          setSearchQuery("");
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.bankItemText,
            {
              color: isSelected ? colors.primary : colors.textPrimary,
              fontWeight: isSelected ? "700" : "500",
            },
          ]}
        >
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={18} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  // ================= RENDER =================
  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 8,
          },
        ]}
      >
        {/* ===== HEADER ===== */}
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
            Bank Account Setup
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
                Loading banks...
              </Text>
            </View>
          ) : (
            <>
              {/* ===== EXISTING DETAILS BANNER ===== */}
              {savedDetails && (
                <View
                  style={[
                    styles.savedBanner,
                    {
                      backgroundColor: colors.success + "18",
                      borderColor: colors.success + "40",
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.success}
                  />
                  <Text style={[styles.savedBannerText, { color: colors.success }]}>
                    Bank account already set up
                  </Text>
                </View>
              )}

              {/* ===== SECTION: BANK ===== */}
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Bank Selection
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Bank
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      selectedBankName
                        ? styles.dropdownText
                        : styles.dropdownPlaceholder,
                      {
                        color: selectedBankName
                          ? colors.textPrimary
                          : colors.textTertiary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedBankName || "Select Bank"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {/* ===== SECTION: ACCOUNT ===== */}
              <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Account Info
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Account Number
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  placeholder="Enter 10-digit account number"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                />
              </View>

              {/* Verify button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    opacity: verifying ? 0.7 : 1,
                  },
                ]}
                onPress={verifyAccount}
                disabled={verifying}
                activeOpacity={0.9}
              >
                {verifying ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={colors.textInverse}
                    />
                    <Text
                      style={[styles.buttonText, { color: colors.textInverse }]}
                    >
                      Verify Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Verified account name */}
              {accountName ? (
                <View
                  style={[
                    styles.verifiedBox,
                    {
                      backgroundColor: colors.success + "12",
                      borderColor: colors.success + "40",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.verifiedIconWrap,
                      { backgroundColor: colors.success + "20" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.verifiedText}>
                    <Text
                      style={[
                        styles.verifiedLabel,
                        { color: colors.success },
                      ]}
                    >
                      Verified Account
                    </Text>
                    <Text
                      style={[
                        styles.accountName,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={2}
                    >
                      {accountName}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      !accountName || !selectedBankCode || saving
                        ? colors.textTertiary
                        : colors.primary,
                    shadowColor: colors.primary,
                    opacity: !accountName || !selectedBankCode ? 0.6 : 1,
                  },
                ]}
                onPress={saveBankDetails}
                disabled={!accountName || !selectedBankCode || saving}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={colors.textInverse}
                    />
                    <Text
                      style={[styles.buttonText, { color: colors.textInverse }]}
                    >
                      Save Bank Details
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* ===== BANK SELECTION MODAL ===== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            {/* Modal header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.inputBorder },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: colors.textPrimary }]}
              >
                Select Bank
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View
              style={[
                styles.modalSearchWrap,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.textPrimary }]}
                placeholder="Search banks..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Bank list */}
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) =>
                item.code
                  ? item.code.toString()
                  : Math.random().toString()
              }
              renderItem={renderBankItem}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBanks}>
                  <Text
                    style={[styles.emptyBanksText, { color: colors.textTertiary }]}
                  >
                    No banks found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
  },

  // ===== HEADER =====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
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

  // ===== SECTIONS =====
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderSpaced: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.1,
    textTransform: "uppercase",
  },

  // ===== SAVED BANNER =====
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  savedBannerText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },

  // ===== FIELDS =====
  field: { marginBottom: 14 },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "500",
    borderWidth: 1,
    minHeight: 48,
    letterSpacing: 0.5,
  },
  dropdown: {
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },

  // ===== VERIFY =====
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  // ===== VERIFIED BOX =====
  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  verifiedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: { flex: 1 },
  verifiedLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
    lineHeight: 20,
  },

  // ===== SAVE =====
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    gap: 8,
    marginTop: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.1,
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    width: "90%",
    maxHeight: "80%",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  modalSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
  modalList: {
    maxHeight: 340,
  },
  bankItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  bankItemText: {
    fontSize: 14.5,
    letterSpacing: -0.1,
    flex: 1,
  },
  emptyBanks: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyBanksText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default BankSetupScreen;