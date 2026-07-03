import { useContext, useState, useRef, useEffect } from "react";
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
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { createPost, updatePost } from "../services/api";
import { PostContext } from "../../context/PostContext";
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

// ===== Main Screen =====
export default function CreatePostScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { userToken } = useContext(AuthContext);
  const { addNewPost, triggerRefresh } = useContext(PostContext);
  const { colors } = useTheme();

  const { editPost } = route.params || {};
  const isEdit = !!editPost;

  // Post fields
  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");

  // Location: Country is fixed
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [availableCities, setAvailableCities] = useState([]);

  // Media
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [existingMediaUrl, setExistingMediaUrl] = useState(null);

  // Animations
  const postScale = useRef(new Animated.Value(1)).current;
  const pickScale = useRef(new Animated.Value(1)).current;

  // Pre‑fill from user profile or edit post
  useEffect(() => {
    if (editPost) {
      setSkill(editPost.skill || "");
      setDescription(editPost.description || "");
      setPrice(editPost.price ? String(editPost.price) : "");
      setTags(editPost.tags?.join(", ") || "");
      const stateName = editPost.locationState || "";
      const cityName = editPost.locationCity || "";
      setSelectedState(stateName);
      setSelectedCity(cityName);
      const foundState = nigeriaStates.find(s => s.name === stateName);
      if (foundState) {
        setAvailableCities(foundState.cities);
      } else {
        setAvailableCities([]);
      }
      setExistingMediaUrl(editPost.media || null);
      setMediaType(editPost.mediaType || "image");
    } else {
      const userState = user?.locationDetails?.state || "";
      const userCity = user?.locationDetails?.city || "";
      setSelectedState(userState);
      setSelectedCity(userCity);
      const foundState = nigeriaStates.find(s => s.name === userState);
      if (foundState) {
        setAvailableCities(foundState.cities);
      } else {
        setAvailableCities([]);
      }
    }
  }, [editPost, user]);

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

  // Pick media
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      let type = asset.type;
      if (!type) {
        if (asset.mimeType?.startsWith("video/")) type = "video";
        else if (asset.mimeType?.startsWith("image/")) type = "image";
        else if (asset.uri.match(/\.(mp4|mov|avi|mkv)$/i)) type = "video";
        else type = "image";
      }
      setMediaUri(asset.uri);
      setMediaType(type);
      setExistingMediaUrl(null);
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
    setExistingMediaUrl(null);
  };

  // Upload media
  const uploadMedia = async (uri, type) => {
    const endpoint = type === "video"
      ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    try {
      const uploadResult = await FileSystem.uploadAsync(endpoint, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        parameters: { upload_preset: UPLOAD_PRESET },
        headers: { 'Accept': 'application/json' },
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const data = JSON.parse(uploadResult.body);
      if (!data.secure_url) {
        throw new Error(data.error?.message || "Upload failed");
      }
      return data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handlePost = async () => {
    if (!skill || !description) {
      return Alert.alert("Error", "Skill and description are required");
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      return Alert.alert("Error", "Please enter a valid service fee (greater than 0)");
    }

    const locationParts = [selectedCity, selectedState].filter(Boolean);
    const locationString = locationParts.join(", ");

    setUploading(true);
    let mediaUrl = null;

    try {
      if (mediaUri) {
        mediaUrl = await uploadMedia(mediaUri, mediaType);
      } else if (existingMediaUrl) {
        mediaUrl = existingMediaUrl;
      }

      const postData = {
        skill,
        description,
        price: priceNum,
        tags: tags.split(",").filter(t => t.trim()),
        location: locationString,
        locationCity: selectedCity,
        locationState: selectedState,
        locationCountry: "Nigeria",
        media: mediaUrl,
        mediaType: mediaType || "image",
      };

      if (isEdit) {
        const response = await updatePost(editPost._id, postData);
        if (response.success !== false) {
          Alert.alert("Success", "Post updated!");
          triggerRefresh();
          navigation.goBack();
        } else {
          Alert.alert("Error", response.message || "Failed to update post");
        }
      } else {
        const tempPost = {
          _id: Math.random().toString(),
          ...postData,
          user: { _id: user?._id || "me", name: user?.name || "You" },
          reviewCount: 0,
          reviews: [],
        };
        addNewPost(tempPost);

        const response = await createPost(postData, userToken);
        if (response.success) {
          Alert.alert("Success", "Post created!");
          triggerRefresh();
          navigation.goBack();
        } else {
          Alert.alert("Error", response.message || "Failed to create post");
        }
      }
    } catch (error) {
      console.log("Post error:", error);
      Alert.alert("Error", error.message || "Failed to save post");
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
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {isEdit ? "Edit Service" : "Create New Service"}
              </Text>
              <View style={styles.placeholder} />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
              {/* Skill */}
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

              {/* Description */}
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

              {/* Price */}
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

              {/* Tags */}
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

              {/* ===== LOCATION DROPDOWNS (Custom) ===== */}
              {/* Country – fixed */}
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

              {/* Media */}
              {(mediaUri || existingMediaUrl) && (
                <View style={styles.mediaPreviewContainer}>
                  {mediaType === "image" ? (
                    <Image source={{ uri: mediaUri || existingMediaUrl }} style={styles.mediaPreview} />
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
                  <Text style={[styles.pickButtonText, { color: colors.primary }]}>
                    {isEdit ? "Change Image/Video" : "Pick Image or Video"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Animated.View style={{ transform: [{ scale: postScale }] }}>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  {
                    backgroundColor: uploading ? colors.gray : colors.primary,
                    shadowColor: colors.primary,
                    shadowOpacity: uploading ? 0 : 0.2,
                  },
                ]}
                onPress={handlePost}
                onPressIn={() => animatePressIn(postScale)}
                onPressOut={() => animatePressOut(postScale)}
                disabled={uploading}
                activeOpacity={0.9}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator color={colors.textInverse} size="small" />
                    <Text style={[styles.postButtonText, { color: colors.textInverse }]}>
                      {isEdit ? "Updating..." : "Posting..."}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={colors.textInverse} />
                    <Text style={[styles.postButtonText, { color: colors.textInverse }]}>
                      {isEdit ? "Update Service" : "Post Service"}
                    </Text>
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

  // Custom picker styles
  pickerWrapper: {
    borderRadius: 16,
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

  // Modal styles
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

  // Media
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
  postButtonText: { fontWeight: "700", fontSize: 17, letterSpacing: 0.3 },
});