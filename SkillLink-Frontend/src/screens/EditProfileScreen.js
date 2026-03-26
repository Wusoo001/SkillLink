import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { api } from "../services/api";

// 🔐 Cloudinary Config (replace with your own)
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

    console.log("Picked Image URI:", asset.uri);
    console.log("Base64 exists:", !!asset.base64);

    // ✅ FORCE BASE64 (ignore blob completely)
    if (asset.base64) {
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      setProfileImage(base64Image);
       console.log("Stored Image:", base64Image.substring(0, 50));
    } else {
      Alert.alert("Error", "Image processing failed. Try another image.");
    }
  }
};

  const uploadImageToCloudinary = async (imageUri) => {
  const formData = new FormData();

  // ✅ Handle base64 (web)
  if (imageUri.startsWith("data:image")) {
    formData.append("file", imageUri);
  } else {
    // ✅ Handle file:// (mobile)
    formData.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "profile.jpg",
    });
  }

  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  console.log("Cloudinary response:", data); // 🔍 CRITICAL DEBUG
  console.log("Secure URL:", data.secure_url);

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

      // ✅ Upload only if it's a local image
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

  if (!initialUser?._id) {
    return (
      <View style={styles.loader}>
        <Text>Loading user data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.image} />
        ) : (
          <Text style={{ color: "#666" }}>Tap to add profile image</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>About</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={about}
        onChangeText={setAbout}
        multiline
      />

      <Text style={styles.label}>Skills</Text>
      <TextInput
        style={styles.input}
        value={skills}
        onChangeText={setSkills}
      />

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={updateProfile}
        disabled={loading}
      >
        <Text style={styles.saveText}>
          {loading ? "Updating..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    padding: 20,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  label: {
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  saveBtn: {
    backgroundColor: "#3B6EF6",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
  },
});