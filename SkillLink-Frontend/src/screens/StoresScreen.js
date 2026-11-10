import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl, TextInput } from "react-native";
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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ===== SEARCH STATE =====
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeout = useRef(null);

  const fetchProducts = async (pageNum = 1, append = false, isRefresh = false, query = searchQuery) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);

      const filters = {};
      if (query && query.trim()) filters.q = query.trim();

      const res = await getProducts(pageNum, PAGE_SIZE, filters);

      if (res.success) {
        if (append) {
          setProducts((prev) => [...prev, ...res.data]);
        } else {
          setProducts(res.data);
        }
        setPage(pageNum);
        setHasMore(res.hasMore !== false);
      }
    } catch (error) {
      console.log("Store fetch error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Reset & reload when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setHasMore(true);
      fetchProducts(1, false, false, searchQuery);
    }, [])
  );

  // Debounced search — resets to page 1 on each new query
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setHasMore(true);
      fetchProducts(1, false, false, searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchProducts(1, false, true, searchQuery);
  };

  const loadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    fetchProducts(page + 1, true, false, searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
      onPress={() => navigation.navigate("ProductDetailScreen", { productId: item._id })}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.images?.[0] || "https://via.placeholder.com/150" }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={[styles.productTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.productPrice, { color: colors.primary }]}>
          ₦{item.price?.toLocaleString()}
        </Text>
        <Text style={[styles.productLocation, { color: colors.textTertiary }]} numberOfLines={1}>
          📍 {item.locationCity || item.location || "Nigeria"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Street Stores</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("CreateProductScreen")}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
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
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
              <Ionicons
                name={searchQuery.trim() ? "search-outline" : "storefront-outline"}
                size={48}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery.trim() ? "No matching products" : "No products yet"}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
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
  searchInput: { flex: 1, fontSize: 14.5, fontWeight: "500", paddingVertical: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 16 },
  productCard: { width: "48%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  productImage: { width: "100%", aspectRatio: 1, backgroundColor: "#E2E8F0" },
  productInfo: { padding: 10 },
  productTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  productLocation: { fontSize: 11 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 40 },
});