import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
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
  Dimensions,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getProductById, deleteProduct, updateProduct } from "../services/api";
import { AuthContext } from "../../context/AuthContext";
import ReportModal from "./ReportModal";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400";

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

const webConfirm = (message) => {
  if (Platform.OS === "web") return window.confirm(message);
  return true;
};

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId } = route.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const requestIdRef = useRef(0);

  const loadProduct = useCallback(
    async ({ silent = false } = {}) => {
      if (!productId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const id = ++requestIdRef.current;
      if (!silent) {
        setLoading(true);
        setLoadError(false);
        setNotFound(false);
      }

      try {
        const res = await getProductById(productId);
        if (id !== requestIdRef.current) return;

        if (res?.success && res.data) {
          setProduct(res.data);
          setLoadError(false);
          setNotFound(false);
        } else if (res && res.success === false) {
          // Backend responded, but product not found
          setNotFound(true);
        } else {
          // Network or unexpected
          setLoadError(true);
        }
      } catch (error) {
        if (id !== requestIdRef.current) return;
        const status = error?.response?.status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setLoadError(true);
        }
      } finally {
        if (id === requestIdRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [productId]
  );

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Silent refresh when screen re-focuses (e.g. after edit)
  const isFirstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      loadProduct({ silent: true });
    }, [loadProduct])
  );

  const handleDelete = () => {
    if (deleting) return;

    const doDelete = async () => {
      setDeleting(true);
      try {
        const res = await deleteProduct(productId);
        if (res?.success) {
          webAlert("Success", "Product deleted");
          navigation.goBack();
        } else {
          webAlert(
            "Couldn't delete",
            res?.message || "Please try again."
          );
        }
      } catch (error) {
        webAlert(
          "Error",
          error?.response?.data?.message || "Could not delete product."
        );
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to delete this product? This cannot be undone."
        )
      ) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]
    );
  };

  const handleToggleSold = async () => {
    if (!product || toggling || deleting) return;
    setToggling(true);
    const nextSold = !product.isSold;
    // Optimistic
    setProduct((prev) => ({ ...prev, isSold: nextSold }));
    try {
      const res = await updateProduct(product._id, { isSold: nextSold });
      if (!res?.success) {
        // Rollback
        setProduct((prev) => ({ ...prev, isSold: !nextSold }));
        webAlert("Error", res?.message || "Could not update product");
      }
    } catch (error) {
      setProduct((prev) => ({ ...prev, isSold: !nextSold }));
      webAlert(
        "Error",
        error?.response?.data?.message || "Could not update product"
      );
    } finally {
      setToggling(false);
    }
  };

  const handleChat = () => {
    if (!product?.user?._id) return;
    navigation.navigate("Chat", {
      productId: product._id,
      recipientId: product.user._id,
      otherPartyName: product.user.name,
      otherPartyImage: product.user.profileImage,
    });
  };

  const handleViewSeller = () => {
    if (!product?.user?._id) return;
    navigation.navigate("UsersProfile", { userId: product.user._id });
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ===== NOT FOUND =====
  if (notFound) {
    return (
      <View
        style={[
          styles.safeArea,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.errorHeader}>
          <TouchableOpacity
            style={[
              styles.floatingBack,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <View
            style={[
              styles.errorIconWrap,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={32}
              color={colors.textTertiary}
            />
          </View>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Product not found
          </Text>
          <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
            This product may have been removed.
          </Text>
        </View>
      </View>
    );
  }

  // ===== NETWORK ERROR =====
  if (loadError || !product) {
    return (
      <View
        style={[
          styles.safeArea,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.errorHeader}>
          <TouchableOpacity
            style={[
              styles.floatingBack,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <View
            style={[
              styles.errorIconWrap,
              { backgroundColor: colors.danger + "15" },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={colors.danger}
            />
          </View>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Couldn't load product
          </Text>
          <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoadError(false);
              loadProduct();
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
    );
  }

  const isOwner = String(product.user?._id || "") === String(user?._id || "");
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [PLACEHOLDER_IMAGE];

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* FLOATING BACK */}
      <TouchableOpacity
        style={[
          styles.floatingBack,
          {
            backgroundColor: colors.card,
            borderColor: colors.inputBorder,
            top: insets.top + 10,
          },
        ]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* FLOATING REPORT (non-owners only) */}
      {!isOwner && product.user?._id ? (
        <TouchableOpacity
          style={[
            styles.floatingReport,
            {
              backgroundColor: colors.card,
              borderColor: colors.inputBorder,
              top: insets.top + 10,
            },
          ]}
          onPress={() => setReportModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="flag-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* IMAGES */}
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(item, i) => `img_${i}`}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_WIDTH,
                backgroundColor: "#E2E8F0",
              }}
            />
          )}
          showsHorizontalScrollIndicator={false}
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.textPrimary, flex: 1 }]}
            >
              {product.title}
            </Text>
            {product.isSold && (
              <View
                style={[
                  styles.soldBadge,
                  {
                    backgroundColor: colors.danger + "15",
                    borderColor: colors.danger + "40",
                  },
                ]}
              >
                <Text style={[styles.soldBadgeText, { color: colors.danger }]}>
                  SOLD
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.price, { color: colors.primary }]}>
            ₦{product.price?.toLocaleString()}
          </Text>

          {/* SELLER CARD — tappable */}
          <TouchableOpacity
            style={[
              styles.sellerCard,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={handleViewSeller}
            activeOpacity={product.user?._id ? 0.85 : 1}
            disabled={!product.user?._id}
          >
            {product.user?.profileImage ? (
              <Image
                source={{ uri: product.user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                  {product.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.sellerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {product.user?.name || "Seller"}
              </Text>
              <View style={styles.sellerLocationRow}>
                <Ionicons
                  name="location-outline"
                  size={11}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.sellerLocation, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {product.locationCity || product.location || "Nigeria"}
                </Text>
              </View>
            </View>
            {product.user?._id && (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Description
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {product.description}
          </Text>
        </View>
      </ScrollView>

      {/* ACTION BAR */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.inputBorder,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {!isOwner ? (
          <TouchableOpacity
            style={[
              styles.chatBtn,
              {
                backgroundColor: product.isSold
                  ? colors.textTertiary
                  : colors.primary,
                opacity: product.isSold ? 0.7 : 1,
              },
            ]}
            onPress={handleChat}
            disabled={product.isSold || !product.user?._id}
            activeOpacity={0.85}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={20}
              color={colors.textInverse}
            />
            <Text style={[styles.chatText, { color: colors.textInverse }]}>
              {product.isSold ? "Item Sold" : "Message Seller"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
              onPress={() =>
                navigation.navigate("CreateProductScreen", {
                  editProduct: product,
                })
              }
              disabled={deleting}
            >
              <Ionicons name="pencil" size={16} color={colors.textPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  opacity: toggling || deleting ? 0.6 : 1,
                },
              ]}
              onPress={handleToggleSold}
              disabled={toggling || deleting}
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
                  <Text
                    style={[styles.actionBtnText, { color: colors.textPrimary }]}
                  >
                    {product.isSold ? "Available" : "Sold"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.danger }]}
              onPress={handleDelete}
              disabled={deleting || toggling}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash" size={16} color={colors.danger} />
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {product.user?._id ? (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          type="user"
          targetId={product.user._id}
          label="Report Seller"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  errorIconWrap: {
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
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 13.5, fontWeight: "700" },

  floatingBack: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingReport: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: { padding: 20 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  soldBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  soldBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  price: { fontSize: 22, fontWeight: "800", marginBottom: 20 },

  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 16 },
  sellerName: { fontSize: 16, fontWeight: "700" },
  sellerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  sellerLocation: { fontSize: 12, flexShrink: 1 },

  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22 },

  actionBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    borderTopWidth: 1,
  },
  chatBtn: {
    flexDirection: "row",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatText: { fontSize: 16, fontWeight: "700" },
  ownerActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13.5, fontWeight: "700" },
});