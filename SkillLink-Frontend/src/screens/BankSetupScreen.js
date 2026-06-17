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
  SafeAreaView,
  Modal,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";

const BankSetupScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
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

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBankItem = ({ item }) => {
  // Ensure we have a unique key; if code is missing, fallback to index
  const key = item.code ? item.code.toString() : `bank_${Math.random()}`;
  return (
    <TouchableOpacity
      key={key}
      style={styles.bankItem}
      onPress={() => {
        setSelectedBankCode(item.code);
        setSelectedBankName(item.name);
        setModalVisible(false);
        setSearchQuery("");
      }}
    >
      <Text style={styles.bankItemText}>{item.name}</Text>
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Account Setup</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Bank</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setModalVisible(true)}
              >
                <Text style={selectedBankName ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedBankName || "Select Bank"}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
                placeholder="Enter account number"
              />
            </View>

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={verifyAccount}
              disabled={verifying}
            >
              <Text style={styles.buttonText}>
                {verifying ? "Verifying..." : "Verify Account"}
              </Text>
            </TouchableOpacity>

            {accountName ? (
              <View style={styles.field}>
                <Text style={styles.label}>Account Name</Text>
                <Text style={styles.accountName}>{accountName}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveButton, (!accountName || !selectedBankCode) && styles.disabled]}
              onPress={saveBankDetails}
              disabled={!accountName || !selectedBankCode || saving}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving..." : "Save Bank Details"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Bank Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Bank</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search banks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => (item.code ? item.code.toString() : Math.random().toString())}
              renderItem={renderBankItem}
              style={styles.modalList}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#0F172A",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dropdown: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: "#1E293B",
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: "#94A3B8",
  },
  dropdownArrow: {
    fontSize: 16,
    color: "#64748B",
  },
  verifyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: "center",
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#94A3B8",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  accountName: {
    fontSize: 16,
    color: "#1E293B",
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalSearch: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 300,
  },
  bankItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  bankItemText: {
    fontSize: 16,
    color: "#1E293B",
  },
  modalCloseButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
});

export default BankSetupScreen;