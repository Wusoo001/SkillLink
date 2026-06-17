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
import { useTheme } from "../context/ThemeContext";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

export default function CreatePostScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { addNewPost } = useContext(PostContext);
  const { colors } = useTheme();

  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [mediaBase64, setMediaBase64] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);

  const postScale = useRef(new Animated.Value(1)).current;
  const pickScale = useRef(new Animated.Value(1)).current;

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

  const uploadMedia = async (base64Data, type) => {
    const formData = new FormData();
    formData.append("file", base64Data);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("cloud_name", CLOUD_NAME);
    const endpoint = type === "video"
      ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" },
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
  };

  const handlePost = async () => {
    if (!skill || !description) {
      return Alert.alert("Error", "Skill and description are required");
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      return Alert.alert("Error", "Please enter a valid service fee (greater than 0)");
    }

    setUploading(true);
    let mediaUrl = null;

    try {
      if (mediaBase64) {
        mediaUrl = await uploadMedia(mediaBase64, mediaType);
      }

      const postData = {
        skill,
        description,
        price: priceNum,
        tags: tags.split(",").filter(t => t.trim()),
        location,
        media: mediaUrl,
        mediaType,
      };

      const tempPost = {
        _id: Math.random().toString(),
        ...postData,
        user: { _id: "me", name: "You" },
      };
      addNewPost(tempPost);

      const response = await createPost(postData, userToken);
      if (response.success) {
        Alert.alert("Success", "Post created!");
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home");
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create New Service</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Skill *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={skill}
                  onChangeText={setSkill}
                  placeholder="e.g., Plumbing, Electrical, Carpentry"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your service..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Service Fee (₦) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="e.g., 5000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Tags (comma separated)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="e.g., fast, affordable, expert"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City or area"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {mediaBase64 && (
                <View style={styles.mediaPreviewContainer}>
                  {mediaType === "image" ? (
                    <Image source={{ uri: mediaBase64 }} style={styles.mediaPreview} />
                  ) : (
                    <View style={[styles.videoPreview, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <Ionicons name="videocam" size={40} color={colors.primary} />
                      <Text style={[styles.videoText, { color: colors.textTertiary }]}>Video selected</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.removeMediaButton, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}
                    onPress={removeMedia}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}

              <Animated.View style={{ transform: [{ scale: pickScale }] }}>
                <TouchableOpacity
                  style={[styles.pickButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                  onPress={pickMedia}
                  onPressIn={() => animatePressIn(pickScale)}
                  onPressOut={() => animatePressOut(pickScale)}
                  activeOpacity={0.9}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                  <Text style={[styles.pickButtonText, { color: colors.primary }]}>Pick Image or Video</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Animated.View style={{ transform: [{ scale: postScale }] }}>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2 },
                  uploading && { backgroundColor: colors.gray, shadowOpacity: 0 },
                ]}
                onPress={handlePost}
                onPressIn={() => animatePressIn(postScale)}
                onPressOut={() => animatePressOut(postScale)}
                disabled={uploading}
                activeOpacity={0.9}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={colors.textInverse} />
                    <Text style={[styles.postButtonText, { color: colors.textInverse }]}>Post Service</Text>
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
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
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
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  placeholder: { width: 40 },
  card: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
  },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  mediaPreviewContainer: { position: "relative", marginBottom: 18 },
  mediaPreview: { width: "100%", height: 180, borderRadius: 16, resizeMode: "cover" },
  videoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  videoText: { marginTop: 8, fontSize: 14 },
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 20,
    padding: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 40,
    gap: 8,
    borderWidth: 1,
  },
  pickButtonText: { fontSize: 15, fontWeight: "600" },
  postButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 48,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  postButtonDisabled: { shadowOpacity: 0 },
  postButtonText: { fontWeight: "700", fontSize: 17, letterSpacing: 0.3 },
});