import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getProductById, deleteProduct, updateProduct } from "../services/api";
import { AuthContext } from "../../context/AuthContext";
import ReportModal from "./ReportModal";

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const loadProduct = () => {
    getProductById(productId).then((res) => {
      if (res.success) setProduct(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const handleDelete = () => {
    const confirm = () => {
      deleteProduct(productId).then((res) => {
        if (res.success) {
          if (Platform.OS === "web") window.alert("Product deleted");
          else Alert.alert("Success", "Product deleted");
          navigation.goBack();
        }
      });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this product?")) confirm();
    } else {
      Alert.alert("Delete Product", "Are you sure you want to delete this product?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirm },
      ]);
    }
  };

  const handleToggleSold = async () => {
    if (!product || toggling) return;
    setToggling(true);
    try {
      const res = await updateProduct(product._id, { isSold: !product.isSold });
      if (res.success) {
        setProduct({ ...product, isSold: !product.isSold });
      } else {
        Alert.alert("Error", res.message || "Could not update product");
      }
    } catch (e) {
      Alert.alert("Error", "Could not update product");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!product) return <View style={styles.center}><Text style={{ color: colors.textPrimary }}>Product not found</Text></View>;

  const isOwner = product.user._id === user?._id;

  const handleChat = () => {
    navigation.navigate("Chat", {
      productId: product._id,
      recipientId: product.user._id,
      otherPartyName: product.user.name,
      otherPartyImage: product.user.profileImage,
    });
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* ✅ FLOATING BACK BUTTON */}
      <TouchableOpacity
        style={[styles.floatingBack, { backgroundColor: colors.card, borderColor: colors.inputBorder, top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* ✅ FLOATING REPORT BUTTON — non-owners only */}
      {!isOwner && (
        <TouchableOpacity
          style={[styles.floatingReport, { backgroundColor: colors.card, borderColor: colors.inputBorder, top: insets.top + 10 }]}
          onPress={() => setReportModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="flag-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Images */}
        <FlatList
          horizontal
          pagingEnabled
          data={product.images.length > 0 ? product.images : ["https://via.placeholder.com/400"]}
          keyExtractor={(item, i) => i.toString()}
          renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: 400, height: 400, backgroundColor: "#E2E8F0" }} />}
          showsHorizontalScrollIndicator={false}
        />

        <View style={styles.content}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>{product.title}</Text>
            {product.isSold && (
              <View style={[styles.soldBadge, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
                <Text style={[styles.soldBadgeText, { color: colors.danger }]}>SOLD</Text>
              </View>
            )}
          </View>
          <Text style={[styles.price, { color: colors.primary }]}>₦{product.price?.toLocaleString()}</Text>

          <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}>
            {product.user.profileImage ? (
              <Image source={{ uri: product.user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={{ color: "#FFF", fontWeight: "700" }}>{product.user.name.charAt(0)}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.sellerName, { color: colors.textPrimary }]}>{product.user.name}</Text>
              <Text style={[styles.sellerLocation, { color: colors.textTertiary }]}>📍 {product.locationCity || product.location || "Nigeria"}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.inputBorder, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {!isOwner ? (
          <TouchableOpacity
            style={[styles.chatBtn, { backgroundColor: product.isSold ? colors.textTertiary : colors.primary }]}
            onPress={handleChat}
            disabled={product.isSold}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
            <Text style={[styles.chatText, { color: "#FFF" }]}>
              {product.isSold ? "Item Sold" : "Message Seller"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              onPress={() => navigation.navigate("CreateProductScreen", { editProduct: product })}
            >
              <Ionicons name="pencil" size={16} color={colors.textPrimary} />
              <Text style={[styles.editText, { color: colors.textPrimary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.soldToggleBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, opacity: toggling ? 0.6 : 1 }]}
              onPress={handleToggleSold}
              disabled={toggling}
            >
              {toggling ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <Ionicons
                    name={product.isSold ? "refresh" : "checkmark-circle"}
                    size={16}
                    color={colors.success}
                  />
                  <Text style={[styles.editText, { color: colors.textPrimary }]}>
                    {product.isSold ? "Available" : "Sold"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: colors.danger }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={16} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ✅ REPORT MODAL — reports the seller (see tradeoff note) */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        type="user"
        targetId={product.user._id}
        label="Report Seller"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  floatingBack: { position: "absolute", left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  floatingReport: { position: "absolute", right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  soldBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  soldBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  price: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  sellerCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 20, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sellerName: { fontSize: 16, fontWeight: "700" },
  sellerLocation: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22 },
  actionBar: { position: "absolute", bottom: 0, width: "100%", padding: 16, borderTopWidth: 1 },
  chatBtn: { flexDirection: "row", height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  chatText: { fontSize: 16, fontWeight: "700" },
  ownerActions: { flexDirection: "row", gap: 8 },
  editBtn: { flex: 1, flexDirection: "row", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1 },
  soldToggleBtn: { flex: 1, flexDirection: "row", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1 },
  editText: { fontSize: 13.5, fontWeight: "700" },
  deleteBtn: { flex: 1, flexDirection: "row", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1 },
  deleteText: { fontSize: 13.5, fontWeight: "700" },
});