import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { nigeriaStates } from "../data/nigeriaStates";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

// ===== Custom Dropdown Component =====
const CustomPicker = ({
  label,
  selectedValue,
  onValueChange,
  items,
  placeholder,
  disabled = false,
  colors,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (value) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.pickerWrapper,
          {
            backgroundColor: colors.card,
            borderColor: colors.inputBorder,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.pickerText,
            {
              color: selectedValue ? colors.textPrimary : colors.textTertiary,
            },
          ]}
          numberOfLines={1}
        >
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.inputBorder },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select {label}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) =>
                typeof item === "string" ? item : item.name
              }
              renderItem={({ item }) => {
                const displayValue =
                  typeof item === "string" ? item : item.name;
                const isSelected = selectedValue === displayValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.inputBorder },
                    ]}
                    onPress={() => handleSelect(displayValue)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {displayValue}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ==============================
// Main Screen
// ==============================
export default function EditProfileScreen({ navigation, route }) {
  const { user, updateUser } = useContext(AuthContext);
  const initialUser = route.params?.userInfo || user || null;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [skills, setSkills] = useState("");

  // Location state
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [availableCities, setAvailableCities] = useState([]);

  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (!initialUser?._id) return;
      const res = await api.get(`/users/${initialUser._id}`);
      const data = res.data;
      setName(data.name || "");
      setAbout(data.bio || "");
      setProfileImage(data.profileImage || null);
      setSkills(data.skills?.join(", ") || "");

      const userState = data.locationDetails?.state || "";
      const userCity = data.locationDetails?.city || "";
      setSelectedState(userState);
      setSelectedCity(userCity);
      const foundState = nigeriaStates.find((s) => s.name === userState);
      if (foundState) {
        setAvailableCities(foundState.cities);
      } else {
        setAvailableCities([]);
      }
    } catch (error) {
      console.log("Profile load error", error);
    }
  };

  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    setSelectedCity("");
    const foundState = nigeriaStates.find((s) => s.name === stateName);
    if (foundState) {
      setAvailableCities(foundState.cities);
    } else {
      setAvailableCities([]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        setProfileImage(base64Image);
      } else {
        Alert.alert("Error", "Image processing failed. Try another image.");
      }
    }
  };

  const uploadImageToCloudinary = async (imageUri) => {
    const formData = new FormData();
    if (imageUri.startsWith("data:image")) {
      formData.append("file", imageUri);
    } else {
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "profile.jpg",
      });
    }
    formData.append("upload_preset", UPLOAD_PRESET);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await response.json();
    if (!data.secure_url) {
      throw new Error(data?.error?.message || "Image upload failed");
    }
    return data.secure_url;
  };

  const updateProfile = async () => {
    try {
      if (!initialUser?._id) {
        Alert.alert("Error", "User not found");
        return;
      }
      setLoading(true);
      let imageUrl = profileImage;
      if (
        profileImage &&
        (profileImage.startsWith("file://") ||
          profileImage.startsWith("data:image"))
      ) {
        imageUrl = await uploadImageToCloudinary(profileImage);
      }

      const locationParts = [selectedCity, selectedState].filter(Boolean);
      const locationString = locationParts.join(", ");

      const payload = {
        name,
        bio: about,
        profileImage: imageUrl,
        skills: skills.split(",").map((s) => s.trim()),
        location: locationString,
        locationDetails: {
          city: selectedCity,
          state: selectedState,
          country: "Nigeria",
        },
      };

      const res = await api.put(`/users/${initialUser._id}`, payload);
      if (updateUser) {
        updateUser(res.data);
      }
      Alert.alert("Success", "Profile updated");
      navigation.goBack();
    } catch (error) {
      console.log("Update error", error);
      Alert.alert("Error", "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const animatePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  if (!initialUser?._id) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textTertiary }]}>
            Loading user data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* ===== HEADER ===== */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[
                  styles.backBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text
                style={[styles.title, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                Edit Profile
              </Text>
              <View style={styles.placeholder} />
            </View>

            {/* ===== AVATAR ===== */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.avatarContainer}
                activeOpacity={0.85}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={[styles.avatar, { borderColor: colors.card }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={32}
                      color={colors.textTertiary}
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.cameraBadge,
                    { backgroundColor: colors.primary, borderColor: colors.card },
                  ]}
                >
                  <Ionicons name="camera" size={14} color={colors.textInverse} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: colors.textTertiary }]}>
                Tap to change photo
              </Text>
            </View>

            {/* ===== PERSONAL INFO ===== */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Personal Info
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Full Name
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
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                About
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                value={about}
                onChangeText={setAbout}
                multiline
                numberOfLines={4}
                placeholder="Tell something about yourself..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Skills (comma separated)
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
                value={skills}
                onChangeText={setSkills}
                placeholder="e.g., Plumbing, Electrical"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* ===== LOCATION ===== */}
            <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Location
              </Text>
            </View>

            {/* Country (fixed) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Country
              </Text>
              <View
                style={[
                  styles.pickerWrapper,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    opacity: 0.7,
                  },
                ]}
              >
                <Text
                  style={[styles.pickerText, { color: colors.textPrimary }]}
                >
                  Nigeria
                </Text>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
              </View>
            </View>

            {/* State */}
            <CustomPicker
              label="State"
              selectedValue={selectedState}
              onValueChange={handleStateChange}
              items={nigeriaStates}
              placeholder="Select a state..."
              colors={colors}
            />

            {/* City */}
            <CustomPicker
              label="City / LGA"
              selectedValue={selectedCity}
              onValueChange={setSelectedCity}
              items={availableCities}
              placeholder={
                availableCities.length === 0
                  ? "Select a state first"
                  : "Select a city..."
              }
              colors={colors}
              disabled={availableCities.length === 0}
            />

            {/* ===== SAVE BUTTON ===== */}
            <Animated.View
              style={[
                styles.saveWrap,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={updateProfile}
                onPressIn={animatePressIn}
                onPressOut={animatePressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                    <Text
                      style={[styles.saveText, { color: colors.textInverse }]}
                    >
                      Save Changes
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { paddingHorizontal: 20 },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, fontSize: 14 },

  // ===== HEADER =====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    flex: 1,
  },
  placeholder: { width: 40 },

  // ===== AVATAR =====
  avatarSection: { alignItems: "center", marginBottom: 26 },
  avatarContainer: { position: "relative" },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarHint: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 10,
    letterSpacing: 0.1,
  },

  // ===== SECTION HEADERS =====
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderSpaced: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },

  // ===== FIELDS =====
  fieldGroup: { marginBottom: 14 },
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
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },

  // ===== PICKER =====
  pickerWrapper: {
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 20,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 15,
    letterSpacing: -0.1,
  },

  // ===== SAVE =====
  saveWrap: { marginTop: 22 },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  saveText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
});