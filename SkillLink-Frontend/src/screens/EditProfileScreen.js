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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { nigeriaStates } from "../data/nigeriaStates";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";
const IMAGE_MAX_WIDTH = 800;
const IMAGE_QUALITY = 0.75;
const UPLOAD_TIMEOUT_MS = 45000;

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

// ===== Custom Dropdown =====
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
              data={items || []}
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
                          color: isSelected
                            ? colors.primary
                            : colors.textPrimary,
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
  const [originalImage, setOriginalImage] = useState(null);
  const [skills, setSkills] = useState("");

  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [availableCities, setAvailableCities] = useState([]);
  const [originalSnapshot, setOriginalSnapshot] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load profile — depends on user id so it re-fires when user becomes available
  useEffect(() => {
    const loadProfile = async () => {
      if (!initialUser?._id) {
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const res = await api.get(`/users/${initialUser._id}`);
        const data = res.data;

        const nextState = data.locationDetails?.state || "";
        const nextCity = data.locationDetails?.city || "";
        const nextName = data.name || "";
        const nextAbout = data.bio || "";
        const nextImage = data.profileImage || null;
        const nextSkills = (data.skills || []).join(", ");

        setName(nextName);
        setAbout(nextAbout);
        setProfileImage(nextImage);
        setOriginalImage(nextImage);
        setSkills(nextSkills);
        setSelectedState(nextState);
        setSelectedCity(nextCity);

        const foundState = nigeriaStates.find((s) => s.name === nextState);
        setAvailableCities(foundState ? foundState.lgas : []);

        setOriginalSnapshot({
          name: nextName,
          about: nextAbout,
          image: nextImage,
          skills: nextSkills,
          state: nextState,
          city: nextCity,
        });
      } catch (error) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [initialUser?._id]);

  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    setSelectedCity("");
    const foundState = nigeriaStates.find((s) => s.name === stateName);
    setAvailableCities(foundState ? foundState.lgas : []);
  };

  const handleBack = () => {
    const hasChanges =
      originalSnapshot &&
      (name !== originalSnapshot.name ||
        about !== originalSnapshot.about ||
        profileImage !== originalSnapshot.image ||
        skills !== originalSnapshot.skills ||
        selectedState !== originalSnapshot.state ||
        selectedCity !== originalSnapshot.city);

    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    if (Platform.OS === "web") {
      if (window.confirm("You have unsaved changes. Discard and leave?")) {
        navigation.goBack();
      }
    } else {
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Leaving now will lose them.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const pickImage = async () => {
    if (picking || saving) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      // Compress before storing in state — prevents large base64 blobs
      try {
        const { width } = await new Promise((resolve, reject) => {
          Image.getSize(
            asset.uri,
            (w, h) => resolve({ width: w, height: h }),
            reject
          );
        });
        const actions = width > IMAGE_MAX_WIDTH ? [{ resize: { width: IMAGE_MAX_WIDTH } }] : [];
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          actions,
          { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
        );
        setProfileImage(compressed.uri);
      } catch {
        // Fallback — use original uri
        setProfileImage(asset.uri);
      }
    } catch (err) {
      webAlert("Error", "Could not pick image: " + err.message);
    } finally {
      setPicking(false);
    }
  };

  const uploadImage = async (uri) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    if (uri.startsWith("file://") || uri.startsWith("content://")) {
      // React Native file upload via fetch
      const filename = uri.split("/").pop() || "profile.jpg";
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: filename,
      });
    } else {
      // Web — fetch the blob first
      const fileRes = await fetch(uri);
      const blob = await fileRes.blob();
      formData.append("file", blob);
    }
    formData.append("upload_preset", UPLOAD_PRESET);

    const uploadRes = await Promise.race([
      fetch(endpoint, { method: "POST", body: formData }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Upload timed out. Check your connection.")),
          UPLOAD_TIMEOUT_MS
        )
      ),
    ]);

    const data = await uploadRes.json();
    if (!data.secure_url) {
      throw new Error(data?.error?.message || "Image upload failed");
    }
    return data.secure_url;
  };

  const updateProfile = async () => {
    if (saving) return;

    if (!initialUser?._id) {
      webAlert("Error", "User not found");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      webAlert("Error", "Name cannot be empty.");
      return;
    }
    if (trimmedName.length > 100) {
      webAlert("Error", "Name must be 100 characters or less.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = profileImage;
      // Only upload if the image is a local file (not an existing https URL)
      if (
        profileImage &&
        !profileImage.startsWith("https://")
      ) {
        imageUrl = await uploadImage(profileImage);
      }

      const locationParts = [selectedCity, selectedState].filter(Boolean);
      const locationString = locationParts.join(", ");

      const parsedSkills = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: trimmedName,
        bio: (about || "").trim(),
        profileImage: imageUrl || "",
        skills: parsedSkills,
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
      webAlert("Success", "Profile updated");
      navigation.goBack();
    } catch (error) {
      webAlert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Profile update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const animatePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const hasChanges =
    originalSnapshot &&
    (name !== originalSnapshot.name ||
      about !== originalSnapshot.about ||
      profileImage !== originalSnapshot.image ||
      skills !== originalSnapshot.skills ||
      selectedState !== originalSnapshot.state ||
      selectedCity !== originalSnapshot.city);

  const saveDisabled = !hasChanges || saving || loading;

  // ===== LOADING =====
  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 8, flex: 1 },
          ]}
        >
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
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </View>
    );
  }

  // ===== ERROR =====
  if (loadError) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 8, flex: 1 },
          ]}
        >
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
          <View style={styles.loader}>
            <View
              style={[
                styles.errorIcon,
                { backgroundColor: colors.danger + "15" },
              ]}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={colors.danger}
              />
            </View>
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
              Couldn't load profile
            </Text>
            <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setLoadError(false);
                setLoading(true);
                // Trigger re-fetch by toggling a state — use location param trick
                // Simpler: extract loadProfile into a callback and call it
                // For brevity here, we reload the screen's effect by forcing state
                // In practice, call the load function directly
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color={colors.textInverse} />
              <Text style={[styles.retryBtnText, { color: colors.textInverse }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
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
            {/* HEADER */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
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

            {/* AVATAR */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.avatarContainer}
                activeOpacity={0.85}
                disabled={picking || saving}
              >
                {profileImage ? (
                  <Image
                    key={profileImage}
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
                  {picking ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Ionicons name="camera" size={14} color={colors.textInverse} />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: colors.textTertiary }]}>
                Tap to change photo
              </Text>
            </View>

            {/* PERSONAL INFO */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Personal Info
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Full Name *
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
                maxLength={100}
                editable={!saving}
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
                maxLength={500}
                editable={!saving}
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
                editable={!saving}
              />
            </View>

            {/* LOCATION */}
            <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Location
              </Text>
            </View>

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
                <Text style={[styles.pickerText, { color: colors.textPrimary }]}>
                  Nigeria
                </Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={colors.textTertiary}
                />
              </View>
            </View>

            <CustomPicker
              label="State"
              selectedValue={selectedState}
              onValueChange={handleStateChange}
              items={nigeriaStates}
              placeholder="Select a state..."
              colors={colors}
              disabled={saving}
            />

            <CustomPicker
              label="LGA"
              selectedValue={selectedCity}
              onValueChange={setSelectedCity}
              items={availableCities}
              placeholder={
                availableCities.length === 0
                  ? "Select a state first"
                  : "Select an LGA..."
              }
              colors={colors}
              disabled={availableCities.length === 0 || saving}
            />

            {/* SAVE BUTTON */}
            <Animated.View
              style={[styles.saveWrap, { transform: [{ scale: scaleAnim }] }]}
            >
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: saveDisabled ? colors.inputBackground : colors.primary,
                    shadowColor: colors.primary,
                    opacity: saveDisabled ? 0.9 : 1,
                    borderWidth: saveDisabled ? 1 : 0,
                    borderColor: colors.inputBorder,
                  },
                ]}
                onPress={updateProfile}
                onPressIn={animatePressIn}
                onPressOut={animatePressOut}
                disabled={saveDisabled}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={saveDisabled ? colors.textTertiary : colors.textInverse}
                    />
                    <Text
                      style={[
                        styles.saveText,
                        { color: saveDisabled ? colors.textTertiary : colors.textInverse },
                      ]}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { paddingHorizontal: 20 },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loaderText: { marginTop: 12, fontSize: 14 },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSub: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700" },

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

  sectionHeader: { marginBottom: 12, marginTop: 4 },
  sectionHeaderSpaced: { marginTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },

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