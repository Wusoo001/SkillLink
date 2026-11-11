import React, { useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getUserProducts } from "../services/api";

const PAGE_SIZE = 50;

export default function MyProductsScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("active"); // active | sold | all

  const fetchProducts = async () => {
    if (!user?._id) return;
    try {
      const res = await getUserProducts(user._id, 1, PAGE_SIZE);
      if (res.success) setProducts(res.data || []);
    } catch (error) {
      console.log("Fetch my products error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [user?._id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const activeCount = products.filter((p) => !p.isSold).length;
  const soldCount = products.filter((p) => p.isSold).length;

  const filtered = products.filter((p) => {
    if (tab === "active") return !p.isSold;
    if (tab === "sold") return p.isSold;
    return true;
  });

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
      onPress={() => navigation.navigate("ProductDetailScreen", { productId: item._id })}
      activeOpacity={0.8}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: item.images?.[0] || "https://via.placeholder.com/150" }}
          style={styles.productImage}
        />
        {item.isSold && (
          <View style={[styles.soldOverlay, { backgroundColor: colors.danger + "CC" }]}>
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.productPrice, { color: colors.primary }]}>
          ₦{item.price?.toLocaleString()}
        </Text>
        <Text style={[styles.productViews, { color: colors.textTertiary }]} numberOfLines={1}>
          👁 {item.views || 0} views
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Products</Text>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("CreateProductScreen")}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Stats line */}
      <View style={styles.statsRow}>
        <Text style={[styles.statsText, { color: colors.textTertiary }]}>
          {activeCount} active · {soldCount} sold
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        {[
          { key: "active", label: `Active (${activeCount})` },
          { key: "sold", label: `Sold (${soldCount})` },
          { key: "all", label: "All" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && { backgroundColor: colors.primary }]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t.key ? colors.textInverse : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {tab === "sold"
                  ? "No sold items"
                  : tab === "active"
                  ? "No active listings"
                  : "No products yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                {tab === "active"
                  ? "Create your first listing to get started."
                  : "Nothing here yet."}
              </Text>
              {tab !== "sold" && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate("CreateProductScreen")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.emptyBtnText, { color: colors.textInverse }]}>List a Product</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  statsRow: { paddingHorizontal: 20, marginBottom: 12 },
  statsText: { fontSize: 13, fontWeight: "600" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 12.5, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 16 },
  productCard: { width: "48%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  productImage: { width: "100%", aspectRatio: 1, backgroundColor: "#E2E8F0" },
  soldOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soldOverlayText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  productInfo: { padding: 10 },
  productTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  productViews: { fontSize: 11 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 40, marginBottom: 16 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: "700" },
});