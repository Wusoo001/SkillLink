import React, { useState, useCallback, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getProducts } from "../services/api";

export default function StoresScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await getProducts(1, 50);
      if (res.success) setProducts(res.data);
    } catch (error) {
      console.log("Store fetch error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Runs every time this screen comes into focus (including when returning from CreateProductScreen)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
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
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="storefront-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No products yet</Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                Be the first to list a product in your area.
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
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