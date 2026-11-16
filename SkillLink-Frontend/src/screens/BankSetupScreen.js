import React, { useState, useEffect, useContext, useMemo } from "react";
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
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

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
  const [loadError, setLoadError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDetails, setSavedDetails] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Snapshot of the last successfully verified pair.
  // Used to force re-verify if user changes account or bank.
  const [verifiedSnapshot, setVerifiedSnapshot] = useState(null);

  useEffect(() => {
    fetchBanks();
    fetchSavedDetails();
  }, []);

  // ================= API CALLS =================
  const fetchBanks = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get("/bank/banks");
      if (res.data.status) setBanks(res.data.data || []);
      else setLoadError(true);
    } catch (error) {
      setLoadError(true);
      webAlert("Error", "Failed to load banks");
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
        // NOTE: We deliberately do NOT set verifiedSnapshot here.
        // Server already validated these, but if user changes anything,
        // we want them to re-verify. Safer to require explicit verification.
      }
    } catch (error) {
      // Silent — user can still enter new details
    }
  };

  const verifyAccount = async () => {
    if (!accountNumber || accountNumber.length !== 10) {
      webAlert("Error", "Enter a valid 10-digit account number");
      return;
    }
    if (!selectedBankCode) {
      webAlert("Error", "Select a bank");
      return;
    }
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await api.post("/bank/resolve", {
        accountNumber,
        bankCode: selectedBankCode,
      });
      if (res.data.status) {
        const name = res.data.data.account_name;
        setAccountName(name);
        // Mark this exact pair as verified
        setVerifiedSnapshot({ accountNumber, bankCode: selectedBankCode });
        webAlert("Verified", `Account name: ${name}`);
      } else {
        webAlert("Error", res.data.message || "Account not found");
      }
    } catch (error) {
      webAlert(
        "Error",
        error.response?.data?.message || "Verification failed"
      );
    } finally {
      setVerifying(false);
    }
  };

  const saveBankDetails = async () => {
    // Gate 1: All fields required
    if (!accountName || !accountNumber || !selectedBankCode) {
      webAlert("Error", "Please verify your account first");
      return;
    }
    // Gate 2: Verification must match current values
    if (
      !verifiedSnapshot ||
      verifiedSnapshot.accountNumber !== accountNumber ||
      verifiedSnapshot.bankCode !== selectedBankCode
    ) {
      webAlert(
        "Re-verify required",
        "Your account details changed since you last verified. Please verify again."
      );
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
      webAlert("Success", "Bank details saved");
      navigation.goBack();
    } catch (error) {
      webAlert(
        "Error",
        error.response?.data?.message || "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  // Any change to accountNumber / bank invalidates verification
  const handleAccountNumberChange = (text) => {
    // Strip non-digits
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(digits);
    if (verifiedSnapshot && digits !== verifiedSnapshot.accountNumber) {
      setVerifiedSnapshot(null);
      setAccountName("");
    }
  };

  const handleBankSelect = (code, name) => {
    setSelectedBankCode(code);
    setSelectedBankName(name);
    setModalVisible(false);
    setSearchQuery("");
    if (verifiedSnapshot && code !== verifiedSnapshot.bankCode) {
      setVerifiedSnapshot(null);
      setAccountName("");
    }
  };

  // ================= FILTER =================
  const filteredBanks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) => typeof b.name === "string" && b.name.toLowerCase().includes(q)
    );
  }, [banks, searchQuery]);

  const needsReverify =
    verifiedSnapshot &&
    (verifiedSnapshot.accountNumber !== accountNumber ||
      verifiedSnapshot.bankCode !== selectedBankCode);

  // ================= BANK ITEM =================
  const renderBankItem = ({ item }) => {
    const isSelected = selectedBankCode === item.code;
    return (
      <TouchableOpacity
        style={[styles.bankItem, { borderBottomColor: colors.inputBorder }]}
        onPress={() => handleBankSelect(item.code, item.name)}
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
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  const saveDisabled = !accountName || !selectedBankCode || saving || needsReverify;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            Bank Account Setup
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
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
          ) : loadError ? (
            <View style={styles.center}>
              <View
                style={[
                  styles.errorIconWrap,
                  { backgroundColor: colors.danger + "15" },
                ]}
              >
                <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
              </View>
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                Couldn't load banks
              </Text>
              <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setLoadError(false);
                  fetchBanks();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color={colors.textInverse} />
                <Text style={[styles.retryBtnText, { color: colors.textInverse }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.savedBannerText, { color: colors.success }]}>
                    Bank account already set up
                  </Text>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Bank Selection
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Bank</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    { backgroundColor: colors.card, borderColor: colors.inputBorder },
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
                        color: selectedBankName ? colors.textPrimary : colors.textTertiary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedBankName || "Select Bank"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
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
                  onChangeText={handleAccountNumberChange}
                  keyboardType="numeric"
                  placeholder="Enter 10-digit account number"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                />
              </View>

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
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.textInverse} />
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                      Verify Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {needsReverify && (
                <View
                  style={[
                    styles.warnBox,
                    {
                      backgroundColor: colors.warning + "12",
                      borderColor: colors.warning + "40",
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={16} color={colors.warning} />
                  <Text style={[styles.warnText, { color: colors.warning }]}>
                    Details changed. Please verify your account again before saving.
                  </Text>
                </View>
              )}

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
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                  <View style={styles.verifiedText}>
                    <Text style={[styles.verifiedLabel, { color: colors.success }]}>
                      Verified Account
                    </Text>
                    <Text
                      style={[styles.accountName, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {accountName}
                    </Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: saveDisabled ? colors.inputBackground : colors.primary,
                    shadowColor: colors.primary,
                    opacity: saveDisabled ? 0.9 : 1,
                    borderWidth: saveDisabled ? 1 : 0,
                    borderColor: colors.inputBorder,
                  },
                ]}
                onPress={saveBankDetails}
                disabled={saveDisabled}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={saveDisabled ? colors.textTertiary : colors.textInverse}
                    />
                    <Text
                      style={[
                        styles.buttonText,
                        { color: saveDisabled ? colors.textTertiary : colors.textInverse },
                      ]}
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

      {/* BANK SELECTION MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.inputBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Bank
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

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
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredBanks}
              keyExtractor={(item, index) =>
                item.code ? String(item.code) : `bank-${index}`
              }
              renderItem={renderBankItem}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyBanks}>
                  <Text style={[styles.emptyBanksText, { color: colors.textTertiary }]}>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },

  errorIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  errorTitle: { fontSize: 17, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  errorSub: { fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 20 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 11, paddingHorizontal: 22, borderRadius: 12,
  },
  retryBtnText: { fontSize: 13.5, fontWeight: "700" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 16, gap: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, flex: 1 },
  placeholder: { width: 40 },

  sectionHeader: { marginBottom: 12, marginTop: 4 },
  sectionHeaderSpaced: { marginTop: 20 },
  sectionTitle: {
    fontSize: 14, fontWeight: "800", letterSpacing: 0.1, textTransform: "uppercase",
  },

  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, marginBottom: 16,
  },
  savedBannerText: { fontSize: 13, fontWeight: "700", letterSpacing: -0.1 },

  field: { marginBottom: 14 },
  label: {
    fontSize: 12.5, fontWeight: "600", marginBottom: 6, letterSpacing: 0.1,
  },
  input: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontWeight: "500", borderWidth: 1,
    minHeight: 48, letterSpacing: 0.5,
  },
  dropdown: {
    borderRadius: 14, paddingHorizontal: 14, minHeight: 48, borderWidth: 1,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  dropdownText: { fontSize: 15, fontWeight: "500", flex: 1, marginRight: 8 },
  dropdownPlaceholder: { fontSize: 15, fontWeight: "500", flex: 1, marginRight: 8 },

  verifyButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: 14, gap: 8, marginTop: 4, marginBottom: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2,
    shadowRadius: 10, elevation: 3,
  },

  warnBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, marginBottom: 14,
  },
  warnText: { fontSize: 12.5, fontWeight: "600", flex: 1, lineHeight: 17 },

  verifiedBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20,
  },
  verifiedIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  verifiedText: { flex: 1 },
  verifiedLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 0.4,
    textTransform: "uppercase", marginBottom: 3,
  },
  accountName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.1, lineHeight: 20 },

  saveButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 54, borderRadius: 14, gap: 8, marginTop: 6,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22,
    shadowRadius: 12, elevation: 4,
  },
  buttonText: { fontWeight: "700", fontSize: 15, letterSpacing: 0.1 },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  modalContainer: {
    borderRadius: 20, borderWidth: 1, padding: 18, width: "90%", maxHeight: "80%",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15,
    shadowRadius: 24, elevation: 10,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  modalSearchWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 14.5, fontWeight: "500", paddingVertical: 0 },
  modalList: { maxHeight: 340 },
  bankItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1,
  },
  bankItemText: { fontSize: 14.5, letterSpacing: -0.1, flex: 1 },
  emptyBanks: { paddingVertical: 40, alignItems: "center" },
  emptyBanksText: { fontSize: 14, fontWeight: "500" },
});

export default BankSetupScreen;