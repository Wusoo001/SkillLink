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
import { SafeAreaView } from "react-native-safe-area-context";
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
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            { color: selectedValue ? colors.textPrimary : colors.textTertiary },
          ]}
        >
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Select {label}
            </Text>
            <FlatList
              data={items}
              keyExtractor={(item) => (typeof item === "string" ? item : item.name)}
              renderItem={({ item }) => {
                const displayValue = typeof item === "string" ? item : item.name;
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleSelect(displayValue)}
                  >
                    <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>
                      {displayValue}
                    </Text>
                    {selectedValue === displayValue && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={[styles.modalClose, { borderTopColor: colors.inputBorder }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
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
      const foundState = nigeriaStates.find(s => s.name === userState);
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
    const foundState = nigeriaStates.find(s => s.name === stateName);
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
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animatePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  if (!initialUser?._id) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textTertiary }]}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* ✅ Added ScrollView */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backBtn, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Profile</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Avatar Section */}
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={[styles.avatar, { borderColor: colors.card }]} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <Ionicons name="camera" size={28} color={colors.textTertiary} />
                  <Text style={[styles.avatarText, { color: colors.textTertiary }]}>Add photo</Text>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                <Ionicons name="camera" size={14} color={colors.textInverse} />
              </View>
            </TouchableOpacity>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>About</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={about}
                  onChangeText={setAbout}
                  multiline
                  numberOfLines={3}
                  placeholder="Tell something about yourself..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Skills (comma separated)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="e.g., Plumbing, Electrical"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* ===== LOCATION DROPDOWNS ===== */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Country</Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      opacity: 0.6,
                    },
                  ]}
                >
                  <Text style={[styles.pickerText, { color: colors.textPrimary }]}>Nigeria</Text>
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
                placeholder="Select a city..."
                colors={colors}
                disabled={availableCities.length === 0}
              />
            </View>

            {/* Save Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2 },
                  loading && { backgroundColor: colors.gray, shadowOpacity: 0 },
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
                  <Text style={[styles.saveText, { color: colors.textInverse }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  placeholder: { width: 40 },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  avatarText: {
    fontSize: 11,
    marginTop: 6,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  formContainer: {
    flex: 1,
    marginVertical: 8,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerWrapper: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 28,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalClose: {
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 8,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 48,
    alignItems: "center",
    marginTop: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  saveText: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});