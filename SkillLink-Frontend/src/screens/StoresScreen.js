import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getProducts } from "../services/api";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export default function StoresScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeout = useRef(null);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const isFirstFocusRef = useRef(true);
  const isFirstSearchEffectRef = useRef(true);

  const fetchProducts = useCallback(
    async (
      pageNum = 1,
      append = false,
      isRefresh = false,
      query = ""
    ) => {
      if (loadingMoreRef.current && pageNum > 1) return;

      const id = ++requestIdRef.current;
      if (pageNum === 1 && !isRefresh) setLoading(true);
      else if (pageNum > 1) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }
      if (pageNum === 1) setLoadError(false);

      try {
        const filters = {};
        const trimmed = (query || "").trim();
        if (trimmed) filters.q = trimmed;

        const res = await getProducts(pageNum, PAGE_SIZE, filters);
        if (id !== requestIdRef.current) return; // stale response

        if (res.success) {
          const incoming = res.data || [];
          if (append) {
            setProducts((prev) => {
              const seen = new Set(prev.map((p) => p._id));
              return [...prev, ...incoming.filter((p) => !seen.has(p._id))];
            });
          } else {
            setProducts(incoming);
          }
          setPage(pageNum);
          setHasMore(res.hasMore !== false);
          setLoadError(false);
        } else {
          if (pageNum === 1) setLoadError(true);
        }
      } catch (error) {
        if (id !== requestIdRef.current) return;
        if (pageNum === 1) setLoadError(true);
      } finally {
        if (id === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    []
  );

  // Focus — initial load + silent refresh on return
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        fetchProducts(1, false, false, searchQuery);
      } else {
        fetchProducts(1, false, true, searchQuery);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Debounced search — skip the very first run (initial load handles it)
  useEffect(() => {
    if (isFirstSearchEffectRef.current) {
      isFirstSearchEffectRef.current = false;
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setHasMore(true);
      setPage(1);
      fetchProducts(1, false, false, searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    setPage(1);
    fetchProducts(1, false, true, searchQuery);
  };

  const loadMore = () => {
    if (loading || loadingMoreRef.current || refreshing || !hasMore) return;
    fetchProducts(page + 1, true, false, searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

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
      <Image
        source={{
          uri: item.images?.[0] || "https://via.placeholder.com/150",
        }}
        style={styles.productImage}
      />
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
        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={11}
            color={colors.textTertiary}
          />
          <Text
            style={[styles.productLocation, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {item.locationCity || item.location || "Nigeria"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Street Stores
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={() => navigation.navigate("MyProductsScreen")}
          >
            <Ionicons name="cube-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("CreateProductScreen")}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search products, categories..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error state (only when no products loaded) */}
      {loadError && !loading && products.length === 0 ? (
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
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoadError(false);
              setLoading(true);
              fetchProducts(1, false, false, searchQuery);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={colors.textInverse} />
            <Text style={[styles.retryBtnText, { color: colors.textInverse }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
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
          onEndReached={loadMore}
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
                  name={
                    searchQuery.trim() ? "search-outline" : "storefront-outline"
                  }
                  size={28}
                  color={colors.textTertiary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery.trim()
                  ? "No matching products"
                  : "No products yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                {searchQuery.trim()
                  ? "Try a different keyword."
                  : "Be the first to list a product in your area."}
              </Text>
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
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  searchSection: { paddingHorizontal: 16, marginBottom: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
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
  productInfo: { padding: 10 },
  productTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  productLocation: { fontSize: 11, flexShrink: 1 },
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
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 16,
  },
  retryBtnText: { fontSize: 13.5, fontWeight: "700" },
});