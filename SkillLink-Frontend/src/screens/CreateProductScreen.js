import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { AuthContext } from "../../context/AuthContext";
import { createProduct, updateProduct } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 0.8;
const UPLOAD_TIMEOUT_MS = 60000;

const showAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
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
  } catch (error) {
    return uri;
  }
};

const withTimeout = (promise, ms, message = "Request timed out") => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
};

export default function CreateProductScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { editProduct } = route.params || {};
  const isEdit = !!editProduct;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedState] = useState(user?.locationDetails?.state || "");
  const [selectedCity] = useState(user?.locationDetails?.city || "");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

  useEffect(() => {
    if (editProduct) {
      setTitle(editProduct.title || "");
      setDescription(editProduct.description || "");
      setPrice(editProduct.price ? String(editProduct.price) : "");
      setCategory(editProduct.category || "Other");
      setImages(editProduct.images || []);
    }
  }, [editProduct]);

  // Stable keys per image — index is unreliable for add/remove operations
  const imageKeysRef = useRef([]);
  useEffect(() => {
    // Keep keys aligned with images array length
    while (imageKeysRef.current.length < images.length) {
      imageKeysRef.current.push(`img_${Date.now()}_${imageKeysRef.current.length}`);
    }
    if (imageKeysRef.current.length > images.length) {
      imageKeysRef.current = imageKeysRef.current.slice(0, images.length);
    }
  }, [images.length]);

  const pickImage = async () => {
    if (images.length >= 3) {
      return showAlert("Limit Reached", "You can only upload up to 3 images.");
    }
    if (isPickingImage) return;
    setIsPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled) {
        const compressed = await compressImage(result.assets[0].uri);
        setImages((prev) => [...prev, compressed]);
      }
    } catch (err) {
      showAlert("Error", "Could not pick image: " + err.message);
    } finally {
      setIsPickingImage(false);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    imageKeysRef.current = imageKeysRef.current.filter((_, i) => i !== index);
  };

  const uploadMedia = async (uri) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    if (Platform.OS === "web") {
      const formData = new FormData();
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob);
      formData.append("upload_preset", UPLOAD_PRESET);
      const uploadRes = await withTimeout(
        fetch(endpoint, { method: "POST", body: formData }),
        UPLOAD_TIMEOUT_MS,
        "Image upload timed out. Check your connection."
      );
      const data = await uploadRes.json();
      if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
      return data.secure_url;
    }
    const uploadResult = await withTimeout(
      FileSystem.uploadAsync(endpoint, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        parameters: { upload_preset: UPLOAD_PRESET },
      }),
      UPLOAD_TIMEOUT_MS,
      "Image upload timed out. Check your connection."
    );
    const data = JSON.parse(uploadResult.body);
    if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
  };

  const handlePost = async () => {
    if (uploading) return;

    if (!title.trim()) return showAlert("Error", "Product title is required.");
    if (title.trim().length > 120) {
      return showAlert("Error", "Product title must be 120 characters or less.");
    }
    if (!description.trim()) return showAlert("Error", "Description is required.");
    if (description.trim().length > 2000) {
      return showAlert("Error", "Description must be 2000 characters or less.");
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return showAlert("Error", "Please enter a valid price.");
    }
    if (images.length === 0) {
      return showAlert("Error", "Please add at least 1 image.");
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: images.length });

    try {
      const uploadedUrls = [];
      for (let i = 0; i < images.length; i++) {
        const uri = images[i];
        setUploadProgress({ current: i + 1, total: images.length });
        if (uri.startsWith("http")) {
          uploadedUrls.push(uri);
        } else {
          try {
            const url = await uploadMedia(uri);
            uploadedUrls.push(url);
          } catch (err) {
            throw new Error(
              `Image ${i + 1} of ${images.length} failed: ${err.message}`
            );
          }
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        category: (category || "Other").trim() || "Other",
        images: uploadedUrls,
        locationCity: selectedCity,
        locationState: selectedState,
        locationCountry: "Nigeria",
      };

      let res;
      if (isEdit) {
        res = await updateProduct(editProduct._id, payload);
      } else {
        res = await createProduct(payload);
      }

      if (res.success) {
        showAlert(
          "Success",
          isEdit ? "Product updated!" : "Product listed successfully!"
        );
        navigation.goBack();
      } else {
        showAlert("Error", res.message || "Failed to save product");
      }
    } catch (error) {
      showAlert("Error", error.message || "Something went wrong");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {isEdit ? "Edit Product" : "List a Product"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Product Title *
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
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Handmade Leather Bag"
          placeholderTextColor={colors.textTertiary}
          maxLength={120}
        />
        <Text style={[styles.helper, { color: colors.textTertiary }]}>
          {title.length}/120
        </Text>

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
          placeholder="Describe your product..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
        />
        <Text style={[styles.helper, { color: colors.textTertiary }]}>
          {description.length}/2000
        </Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Price (₦) *
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
          placeholder="e.g., 15000"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Category
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
          value={category}
          onChangeText={setCategory}
          placeholder="e.g., Fashion, Electronics, Home"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Images (1–3) *
        </Text>
        <View style={styles.imageRow}>
          {images.map((uri, i) => (
            <View key={imageKeysRef.current[i] || `fallback_${i}`} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImg}
                onPress={() => removeImage(i)}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.danger}
                />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 3 && (
            <TouchableOpacity
              style={[
                styles.addImgBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
              onPress={pickImage}
              disabled={isPickingImage}
            >
              {isPickingImage ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={colors.textTertiary}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {uploadProgress && (
          <Text style={[styles.uploadStatus, { color: colors.textTertiary }]}>
            Uploading image {uploadProgress.current} of {uploadProgress.total}...
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              opacity: uploading ? 0.7 : 1,
            },
          ]}
          onPress={handlePost}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.submitText, { color: "#FFF" }]}>
              {isEdit ? "Update Product" : "Publish Product"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 48,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  helper: { fontSize: 11, marginTop: 4, textAlign: "right" },
  imageRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 },
  imageWrap: { position: "relative" },
  imagePreview: { width: 80, height: 80, borderRadius: 12 },
  removeImg: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFF",
    borderRadius: 10,
  },
  addImgBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  uploadStatus: {
    fontSize: 12.5,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 14,
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  submitText: { fontSize: 16, fontWeight: "700" },
});