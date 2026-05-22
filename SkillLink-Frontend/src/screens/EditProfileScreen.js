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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";

// Cloudinary Config
const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

export default function EditProfileScreen({ navigation, route }) {
  const { user, updateUser } = useContext(AuthContext);
  const initialUser = route.params?.userInfo || user || null;

  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [skills, setSkills] = useState("");
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
    } catch (error) {
      console.log("Profile load error", error);
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
      const payload = {
        name,
        bio: about,
        profileImage: imageUrl,
        skills: skills.split(",").map((s) => s.trim()),
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Avatar Section - smaller to save space */}
          <TouchableOpacity
            onPress={pickImage}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={28} color="#64748B" />
                <Text style={styles.avatarText}>Add photo</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Form Fields - compact but readable */}
          <View style={styles.formContainer}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>About</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={about}
                onChangeText={setAbout}
                multiline
                numberOfLines={3}
                placeholder="Tell something about yourself..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Skills (comma separated)</Text>
              <TextInput
                style={styles.input}
                value={skills}
                onChangeText={setSkills}
                placeholder="e.g., Plumbing, Electrical"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Save Button - at bottom */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={updateProfile}
              onPressIn={animatePressIn}
              onPressOut={animatePressOut}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
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
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  avatarText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#2563EB",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    marginVertical: 8,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 48,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});