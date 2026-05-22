import { useContext, useState, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { createPost } from "../services/api";
import { PostContext } from "../../context/PostContext";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

export default function CreatePostScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { addNewPost } = useContext(PostContext);

  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [mediaBase64, setMediaBase64] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Animation for buttons
  const postScale = useRef(new Animated.Value(1)).current;
  const pickScale = useRef(new Animated.Value(1)).current;

  // ==============================
  // PICK MEDIA (unchanged logic)
  // ==============================
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const type = asset.type;
      let base64 = asset.base64;
      if (type === "video" && !base64) {
        const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64 = fileBase64;
      }
      const mimeType = type === "image" ? "image/jpeg" : "video/mp4";
      const dataUrl = `data:${mimeType};base64,${base64}`;
      setMediaBase64(dataUrl);
      setMediaType(type);
    }
  };

  const removeMedia = () => {
    setMediaBase64(null);
    setMediaType(null);
  };

  // ==============================
  // UPLOAD TO CLOUDINARY (unchanged)
  // ==============================
  const uploadMedia = async (base64Data, type) => {
    const formData = new FormData();
    formData.append("file", base64Data);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("cloud_name", CLOUD_NAME);

    const endpoint = type === "video"
      ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    console.log("Uploading to:", endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" },
    });
    const data = await res.json();
    console.log("Cloudinary response:", data);
    if (!data.secure_url) {
      throw new Error(data.error?.message || "Upload failed");
    }
    return data.secure_url;
  };

  // ==============================
  // CREATE POST (unchanged)
  // ==============================
  const handlePost = async () => {
    if (!skill || !description) {
      return Alert.alert("Error", "Skill and description are required");
    }

    setUploading(true);
    let mediaUrl = null;

    try {
      if (mediaBase64) {
        mediaUrl = await uploadMedia(mediaBase64, mediaType);
      }

      const tempPost = {
        _id: Math.random().toString(),
        skill,
        description,
        tags: tags.split(",").filter(t => t.trim()),
        location,
        media: mediaUrl,
        mediaType,
        user: { _id: "me", name: "You" },
      };
      addNewPost(tempPost);

      const response = await createPost(
        {
          skill,
          description,
          tags: tags.split(",").filter(t => t.trim()),
          location,
          media: mediaUrl,
          mediaType,
        },
        userToken
      );

      if (response.success) {
        Alert.alert("Success", "Post created!");
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("Home");
        }
      } else {
        Alert.alert("Error", response.message || "Failed to create post");
      }
    } catch (error) {
      console.log("Create post error:", error);
      Alert.alert("Error", error.message || "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const animatePressIn = (anim) => {
    Animated.spring(anim, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animatePressOut = (anim) => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create New Service</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Skill *</Text>
                <TextInput
                  style={styles.input}
                  value={skill}
                  onChangeText={setSkill}
                  placeholder="e.g., Plumbing, Electrical, Carpentry"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your service..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="e.g., fast, affordable, expert"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City or area"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Media Preview */}
              {mediaBase64 && (
                <View style={styles.mediaPreviewContainer}>
                  {mediaType === "image" ? (
                    <Image source={{ uri: mediaBase64 }} style={styles.mediaPreview} />
                  ) : (
                    <View style={styles.videoPreview}>
                      <Ionicons name="videocam" size={40} color="#2563EB" />
                      <Text style={styles.videoText}>Video selected</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={removeMedia}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Pick Media Button */}
              <Animated.View style={{ transform: [{ scale: pickScale }] }}>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={pickMedia}
                  onPressIn={() => animatePressIn(pickScale)}
                  onPressOut={() => animatePressOut(pickScale)}
                  activeOpacity={0.9}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#2563EB" />
                  <Text style={styles.pickButtonText}>Pick Image or Video</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Post Button */}
            <Animated.View style={{ transform: [{ scale: postScale }] }}>
              <TouchableOpacity
                style={[styles.postButton, uploading && styles.postButtonDisabled]}
                onPress={handlePost}
                onPressIn={() => animatePressIn(postScale)}
                onPressOut={() => animatePressOut(postScale)}
                disabled={uploading}
                activeOpacity={0.9}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.postButtonText}>Post Service</Text>
                  </>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  mediaPreviewContainer: {
    position: "relative",
    marginBottom: 18,
  },
  mediaPreview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    resizeMode: "cover",
  },
  videoPreview: {
    width: "100%",
    height: 180,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  videoText: {
    marginTop: 8,
    fontSize: 14,
    color: "#475569",
  },
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    borderRadius: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pickButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  postButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 48,
    gap: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  postButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
  },
  postButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
});