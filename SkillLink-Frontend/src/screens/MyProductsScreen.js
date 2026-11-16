import React, { useState, useCallback, useContext, useRef, useEffect } from "react";
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

const PAGE_SIZE = 20;

export default function MyProductsScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState("active");

  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const isFirstFocusRef = useRef(true);

  const fetchProducts = useCallback(
    async (pageNum = 1, append = false, { silent = false } = {}) => {
      if (!user?._id) {
        setLoading(false);
        return;
      }
      if (loadingMoreRef.current) return;

      const id = ++requestIdRef.current;
      if (!silent) {
        if (pageNum === 1) setLoading(true);
        else loadingMoreRef.current = true;
        setLoadingMore(pageNum > 1);
      }
      if (pageNum === 1) setLoadError(false);

      try {
        const res = await getUserProducts(user._id, pageNum, PAGE_SIZE);
        if (id !== requestIdRef.current) return;

        if (res.success) {
          const incoming = res.data || [];
          if (append) {
            setProducts((prev) => {
              // Dedupe by _id — protects against backend pagination overlaps
              const seen = new Set(prev.map((p) => p._id));
              return [...prev, ...incoming.filter((p) => !seen.has(p._id))];
            });
          } else {
            setProducts(incoming);
          }
          setPage(pageNum);
          setHasMore(incoming.length === PAGE_SIZE);
          setLoadError(false);
        } else {
          if (pageNum === 1 && !silent) setLoadError(true);
        }
      } catch (error) {
        if (id !== requestIdRef.current) return;
        if (pageNum === 1 && !silent) setLoadError(true);
      } finally {
        if (id === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [user?._id]
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        fetchProducts(1, false, { silent: false });
      } else {
        // Silent refresh on re-focus — no flicker
        fetchProducts(1, false, { silent: true });
      }
    }, [fetchProducts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchProducts(1, false, { silent: true });
  };

  const loadMore = () => {
    if (loading || refreshing || !hasMore || loadingMoreRef.current) return;
    fetchProducts(page + 1, true, { silent: false });
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
      style={[
        styles.productCard,
        { backgroundColor: colors.card, borderColor: colors.inputBorder },
      ]}
      onPress={() =>
        navigation.navigate("ProductDetailScreen", { productId: item._id })
      }
      activeOpacity={0.8}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.productImage}
        />
        {item.isSold && (
          <View
            style={[
              styles.soldOverlay,
              { backgroundColor: colors.danger + "CC" },
            ]}
          >
            <Text style={styles.soldOverlayText}>SOLD</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text
          style={[styles.productTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={[styles.productPrice, { color: colors.primary }]}>
          ₦{item.price?.toLocaleString()}
        </Text>
        <View style={styles.viewsRow}>
          <Ionicons name="eye-outline" size={12} color={colors.textTertiary} />
          <Text
            style={[styles.productViews, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {item.views || 0} views
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ===== ERROR STATE =====
  if (loadError && !loading && products.length === 0) {
    return (
      <View
        style={[
          styles.safeArea,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            My Products
          </Text>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("CreateProductScreen")}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <View
            style={[
              styles.emptyIconWrap,
              { backgroundColor: colors.danger + "15" },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={colors.danger}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Couldn't load products
          </Text>
          <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoadError(false);
              setLoading(true);
              fetchProducts(1, false, { silent: false });
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={colors.textInverse} />
            <Text style={[styles.emptyBtnText, { color: colors.textInverse }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.safeArea,
        { backgroundColor: colors.background, paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          My Products
        </Text>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("CreateProductScreen")}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.statsText, { color: colors.textTertiary }]}>
          {activeCount} active · {soldCount} sold
        </Text>
      </View>

      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        {[
          { key: "active", label: `Active (${activeCount})` },
          { key: "sold", label: `Sold (${soldCount})` },
          { key: "all", label: "All" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              tab === t.key && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    tab === t.key ? colors.textInverse : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={tab === "all" ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={28}
                  color={colors.textTertiary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {tab === "sold"
                  ? "No sold items yet"
                  : tab === "active"
                  ? "No active listings"
                  : "No products yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                {tab === "active"
                  ? "Create your first listing to get started."
                  : tab === "sold"
                  ? "Items you mark as sold will appear here."
                  : "Nothing here yet."}
              </Text>
              {tab !== "sold" && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate("CreateProductScreen")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color={colors.textInverse} />
                  <Text
                    style={[styles.emptyBtnText, { color: colors.textInverse }]}
                  >
                    List a Product
                  </Text>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 16 },
  productCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
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
  viewsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  productViews: { fontSize: 11 },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700" },
});