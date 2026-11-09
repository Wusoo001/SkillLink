import React, { useState, useContext, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { AuthContext } from "../../context/AuthContext";
import { createProduct, updateProduct } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

const showAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
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

  useEffect(() => {
    if (editProduct) {
      setTitle(editProduct.title || "");
      setDescription(editProduct.description || "");
      setPrice(editProduct.price ? String(editProduct.price) : "");
      setCategory(editProduct.category || "Other");
      setImages(editProduct.images || []);
    }
  }, [editProduct]);

  const pickImage = async () => {
    if (images.length >= 3) return showAlert("Limit Reached", "You can only upload up to 3 images.");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled) setImages([...images, result.assets[0].uri]);
    } catch (err) {
      showAlert("Error", "Could not pick image: " + err.message);
    }
  };

  const uploadMedia = async (uri) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    if (Platform.OS === "web") {
      const formData = new FormData();
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob);
      formData.append("upload_preset", UPLOAD_PRESET);
      const uploadRes = await fetch(endpoint, { method: "POST", body: formData });
      const data = await uploadRes.json();
      if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
      return data.secure_url;
    }
    const uploadResult = await FileSystem.uploadAsync(endpoint, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      parameters: { upload_preset: UPLOAD_PRESET },
    });
    const data = JSON.parse(uploadResult.body);
    if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
  };

  const handlePost = async () => {
    if (!title.trim()) return showAlert("Error", "Product title is required.");
    if (!description.trim()) return showAlert("Error", "Description is required.");
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return showAlert("Error", "Please enter a valid price.");
    if (images.length === 0) return showAlert("Error", "Please add at least 1 image.");

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const uri of images) {
        if (uri.startsWith("http")) {
          uploadedUrls.push(uri); // Already on Cloudinary
        } else {
          const url = await uploadMedia(uri);
          uploadedUrls.push(url);
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        category: category.trim() || "Other",
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
        showAlert("Success", isEdit ? "Product updated!" : "Product listed successfully!");
        navigation.goBack();
      } else {
        showAlert("Error", res.message || "Failed to save product");
      }
    } catch (error) {
      showAlert("Error", error.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.inputBorder }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {isEdit ? "Edit Product" : "List a Product"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Product Title *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={title} onChangeText={setTitle} placeholder="e.g., Handmade Leather Bag" placeholderTextColor={colors.textTertiary} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={description} onChangeText={setDescription} placeholder="Describe your product..." placeholderTextColor={colors.textTertiary} multiline />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Price (₦) *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={price} onChangeText={setPrice} placeholder="e.g., 15000" placeholderTextColor={colors.textTertiary} keyboardType="numeric" />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={category} onChangeText={setCategory} placeholder="e.g., Fashion, Electronics, Home" placeholderTextColor={colors.textTertiary} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Images (1–3) *</Text>
        <View style={styles.imageRow}>
          {images.map((uri, i) => (
            <View key={i} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 3 && (
            <TouchableOpacity style={[styles.addImgBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]} onPress={pickImage}>
              <Ionicons name="camera-outline" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.7 : 1 }]} onPress={handlePost} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.submitText, { color: "#FFF" }]}>{isEdit ? "Update Product" : "Publish Product"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, minHeight: 48 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  imageRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 },
  imageWrap: { position: "relative" },
  imagePreview: { width: 80, height: 80, borderRadius: 12 },
  removeImg: { position: "absolute", top: -6, right: -6, backgroundColor: "#FFF", borderRadius: 10 },
  addImgBtn: { width: 80, height: 80, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed" },
  submitBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 30 },
  submitText: { fontSize: 16, fontWeight: "700" },
});