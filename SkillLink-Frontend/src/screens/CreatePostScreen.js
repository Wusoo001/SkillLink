import React, { useContext, useState, useEffect, useRef } from "react";
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
  Keyboard,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../../context/AuthContext";
import { createPost, updatePost } from "../services/api";
import { PostContext } from "../../context/PostContext";
import { useTheme } from "../context/ThemeContext";
import { nigeriaStates } from "../data/nigeriaStates";

let VideoCompressor = null;
if (Platform.OS !== "web") {
  try {
    VideoCompressor = require("react-native-compressor").Video;
  } catch {}
}

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 0.8;
const UPLOAD_TIMEOUT_MS = 60000;
const MIN_PRICE = 5000;

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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
            { color: selectedValue ? colors.textPrimary : colors.textTertiary },
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
                    onPress={() => {
                      onValueChange(displayValue);
                      setModalVisible(false);
                    }}
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

// ===== Main Screen =====
export default function CreatePostScreen({ navigation, route }) {
  const { user, userToken } = useContext(AuthContext);
  const { addNewPost, triggerRefresh } = useContext(PostContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { editPost } = route.params || {};
  const isEdit = !!editPost;

  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");

  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [availableCities, setAvailableCities] = useState([]);
  const [originalSnapshot, setOriginalSnapshot] = useState(null);

  const [mediaUri, setMediaUri] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [picking, setPicking] = useState(false);

  const [uploading, setUploading] = useState(false);

  const postScale = useRef(new Animated.Value(1)).current;
  const pickScale = useRef(new Animated.Value(1)).current;

  // Pre-fill
  useEffect(() => {
    if (editPost) {
      const stateName = editPost.locationState || "";
      const cityName = editPost.locationCity || "";
      setSkill(editPost.skill || "");
      setDescription(editPost.description || "");
      setPrice(editPost.price ? String(editPost.price) : "");
      setTags(editPost.tags?.join(", ") || "");
      setSelectedState(stateName);
      setSelectedCity(cityName);
      const foundState = nigeriaStates.find((s) => s.name === stateName);
      setAvailableCities(foundState ? foundState.lgas : []);
      setExistingMediaUrl(editPost.media || null);
      setMediaType(editPost.mediaType || "image");
      setOriginalSnapshot({
        skill: editPost.skill || "",
        description: editPost.description || "",
        price: editPost.price ? String(editPost.price) : "",
        tags: editPost.tags?.join(", ") || "",
        state: stateName,
        city: cityName,
        media: editPost.media || null,
      });
    } else {
      const userState = user?.locationDetails?.state || "";
      const userCity = user?.locationDetails?.city || "";
      setSelectedState(userState);
      setSelectedCity(userCity);
      const foundState = nigeriaStates.find((s) => s.name === userState);
      setAvailableCities(foundState ? foundState.lgas : []);
    }
  }, [editPost, user]);

  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    setSelectedCity("");
    const foundState = nigeriaStates.find((s) => s.name === stateName);
    setAvailableCities(foundState ? foundState.lgas : []);
  };

  const getFileSize = async (uri) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info?.size || 0;
    } catch {
      return 0;
    }
  };

  const compressImage = async (uri) => {
    try {
      const { width, height } = await new Promise((resolve, reject) => {
        Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
      });
      const actions = [];
      if (width > IMAGE_MAX_WIDTH || height > IMAGE_MAX_WIDTH) {
        if (width >= height) actions.push({ resize: { width: IMAGE_MAX_WIDTH } });
        else actions.push({ resize: { height: IMAGE_MAX_WIDTH } });
      }
      const result = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return result.uri;
    } catch {
      return uri;
    }
  };

  const compressVideo = async (uri, onProgress) => {
    if (!VideoCompressor) return uri;
    try {
      return await VideoCompressor.compress(
        uri,
        { compressionMethod: "auto", minimumFileSizeForCompress: 1 },
        (progress) => onProgress && onProgress(progress)
      );
    } catch {
      return uri;
    }
  };

  const handleBack = () => {
    const hasChanges = isEdit
      ? originalSnapshot &&
        (skill !== originalSnapshot.skill ||
          description !== originalSnapshot.description ||
          price !== originalSnapshot.price ||
          tags !== originalSnapshot.tags ||
          selectedState !== originalSnapshot.state ||
          selectedCity !== originalSnapshot.city ||
          existingMediaUrl !== originalSnapshot.media ||
          mediaUri !== null)
      : skill || description || price || tags || mediaUri;

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

  const pickMedia = async () => {
    if (picking || compressing) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      let type = asset.type;
      if (!type) {
        if (asset.mimeType?.startsWith("video/")) type = "video";
        else if (asset.mimeType?.startsWith("image/")) type = "image";
        else if (asset.uri.match(/\.(mp4|mov|avi|mkv|webm)$/i)) type = "video";
        else type = "image";
      }
      if (type !== "image" && type !== "video") type = "image";

      setCompressing(true);
      setCompressionProgress(0);

      try {
        let finalUri = asset.uri;
        if (type === "image") {
          finalUri = await compressImage(asset.uri);
        } else if (Platform.OS !== "web") {
          finalUri = await compressVideo(asset.uri, (p) =>
            setCompressionProgress(p)
          );
        }
        setMediaUri(finalUri);
        setMediaType(type);
        setExistingMediaUrl(null);
      } catch {
        setMediaUri(asset.uri);
        setMediaType(type);
        setExistingMediaUrl(null);
      } finally {
        setCompressing(false);
        setCompressionProgress(0);
      }
    } catch (err) {
      webAlert("Error", "Could not pick media: " + err.message);
    } finally {
      setPicking(false);
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
    setExistingMediaUrl(null);
  };

  const uploadMedia = async (uri, type) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${
      type === "video" ? "video" : "image"
    }/upload`;

    const uploadPromise = FileSystem.uploadAsync(endpoint, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      parameters: { upload_preset: UPLOAD_PRESET },
      headers: { Accept: "application/json" },
    });

    const uploadResult = await Promise.race([
      uploadPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Upload timed out. Check your connection.")),
          UPLOAD_TIMEOUT_MS
        )
      ),
    ]);

    if (uploadResult.status !== 200) {
      throw new Error(`Upload failed (status ${uploadResult.status})`);
    }
    const data = JSON.parse(uploadResult.body);
    if (!data.secure_url) {
      throw new Error(data.error?.message || "Upload failed");
    }
    return data.secure_url;
  };

  const handlePost = async () => {
    if (uploading || compressing) return;

    Keyboard.dismiss();

    const trimmedSkill = skill.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSkill || !trimmedDescription) {
      return webAlert("Missing info", "Skill and description are required.");
    }
    if (trimmedSkill.length > 100) {
      return webAlert("Too long", "Skill must be 100 characters or less.");
    }
    if (trimmedDescription.length > 2000) {
      return webAlert(
        "Too long",
        "Description must be 2000 characters or less."
      );
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      return webAlert("Invalid price", "Please enter a valid service fee.");
    }
    if (priceNum < MIN_PRICE) {
      return webAlert(
        "Minimum price required",
        `Service fee must be at least ₦${MIN_PRICE.toLocaleString()} so clients can book with escrow protection.`
      );
    }

    const locationParts = [selectedCity, selectedState].filter(Boolean);
    const locationString = locationParts.join(", ");

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setUploading(true);

    try {
      let mediaUrl = existingMediaUrl;
      if (mediaUri) {
        mediaUrl = await uploadMedia(mediaUri, mediaType || "image");
      }

      const postData = {
        skill: trimmedSkill,
        description: trimmedDescription,
        price: priceNum,
        tags: parsedTags,
        location: locationString,
        locationCity: selectedCity,
        locationState: selectedState,
        locationCountry: "Nigeria",
        media: mediaUrl || null,
        mediaType: mediaType || "image",
      };

      if (isEdit) {
        const response = await updatePost(editPost._id, postData);
        if (response.success === false) {
          throw new Error(response.message || "Failed to update post");
        }
        webAlert("Success", "Post updated!");
        triggerRefresh();
        navigation.goBack();
      } else {
        const tempPost = {
          _id: `temp_${uid()}`,
          ...postData,
          user: { _id: user?._id || "me", name: user?.name || "You" },
          reviewCount: 0,
          reviews: [],
        };
        addNewPost(tempPost);

        const response = await createPost(postData, userToken);
        if (!response.success) {
          throw new Error(response.message || "Failed to create post");
        }
        webAlert("Success", "Post created!");
        triggerRefresh();
        navigation.goBack();
      }
    } catch (error) {
      webAlert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to save post"
      );
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
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={[
                  styles.backButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <Text
                style={[styles.headerTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {isEdit ? "Edit Service" : "New Service"}
              </Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Service Details
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Skill *
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
                value={skill}
                onChangeText={setSkill}
                placeholder="e.g., Plumbing, Electrical"
                placeholderTextColor={colors.textTertiary}
                maxLength={100}
                editable={!uploading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Description *
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
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your service..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                maxLength={2000}
                editable={!uploading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Service Fee (₦) *
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
                value={price}
                onChangeText={setPrice}
                placeholder="e.g., 5000 (minimum)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                editable={!uploading}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  marginTop: 4,
                }}
              >
                Minimum ₦5,000 — required for escrow protection
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Tags (comma separated)
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
                value={tags}
                onChangeText={setTags}
                placeholder="e.g., fast, affordable, expert"
                placeholderTextColor={colors.textTertiary}
                editable={!uploading}
              />
            </View>

            <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
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
                <Text
                  style={[styles.pickerText, { color: colors.textPrimary }]}
                >
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
              disabled={uploading}
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
              disabled={availableCities.length === 0 || uploading}
            />

            <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Media
              </Text>
            </View>

            {compressing && (
              <View
                style={[
                  styles.compressingBox,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary + "40",
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.compressingTitle,
                      { color: colors.primary },
                    ]}
                  >
                    Optimizing your media...
                  </Text>
                  {compressionProgress > 0 && (
                    <Text
                      style={[
                        styles.compressingText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {Math.round(compressionProgress * 100)}% complete
                    </Text>
                  )}
                </View>
              </View>
            )}

            {(mediaUri || existingMediaUrl) && !compressing && (
              <View style={styles.mediaPreviewContainer}>
                {mediaType === "image" ? (
                  <Image
                    key={mediaUri || existingMediaUrl}
                    source={{ uri: mediaUri || existingMediaUrl }}
                    style={styles.mediaPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.videoPreview,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="videocam"
                      size={36}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.videoText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Video ready to upload
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.removeMediaButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  onPress={removeMedia}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: pickScale }] }}>
              <TouchableOpacity
                style={[
                  styles.pickButton,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary + "40",
                    opacity: compressing || picking || uploading ? 0.5 : 1,
                  },
                ]}
                onPress={pickMedia}
                onPressIn={() => animatePressIn(pickScale)}
                onPressOut={() => animatePressOut(pickScale)}
                activeOpacity={0.85}
                disabled={compressing || picking || uploading}
              >
                {picking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={colors.primary}
                  />
                )}
                <Text
                  style={[styles.pickButtonText, { color: colors.primary }]}
                >
                  {isEdit ? "Change Media" : "Pick Image or Video"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[styles.postWrap, { transform: [{ scale: postScale }] }]}
            >
              <TouchableOpacity
                style={[
                  styles.postButton,
                  {
                    backgroundColor:
                      uploading || compressing || picking
                        ? colors.gray
                        : colors.primary,
                    shadowColor: colors.primary,
                    opacity: uploading || compressing || picking ? 0.7 : 1,
                  },
                ]}
                onPress={handlePost}
                onPressIn={() => animatePressIn(postScale)}
                onPressOut={() => animatePressOut(postScale)}
                disabled={uploading || compressing || picking}
                activeOpacity={0.9}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator
                      color={colors.textInverse}
                      size="small"
                    />
                    <Text
                      style={[
                        styles.postButtonText,
                        { color: colors.textInverse },
                      ]}
                    >
                      {isEdit ? "Updating..." : "Posting..."}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={isEdit ? "checkmark-circle" : "send"}
                      size={19}
                      color={colors.textInverse}
                    />
                    <Text
                      style={[
                        styles.postButtonText,
                        { color: colors.textInverse },
                      ]}
                    >
                      {isEdit ? "Update Service" : "Post Service"}
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    flex: 1,
  },
  placeholder: { width: 40 },

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

  compressingBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  compressingTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  compressingText: {
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },

  mediaPreviewContainer: { position: "relative", marginBottom: 12 },
  mediaPreview: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  videoPreview: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  videoText: { marginTop: 6, fontSize: 13, fontWeight: "500" },
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  pickButtonText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.1 },

  postWrap: { marginTop: 26 },
  postButton: {
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
  postButtonText: {
    fontWeight: "700",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
});