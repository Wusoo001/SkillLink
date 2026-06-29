import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getUserReviews } from "../services/api";

export default function ReviewsScreen({ navigation, route }) {
  const { userId, providerName } = route.params || {};
  const { colors } = useTheme();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadReviews = async (pageNum = 1, append = false) => {
    if (!userId) return;
    try {
      if (pageNum === 1) setLoading(true);
      const res = await getUserReviews(userId, pageNum, 10);
      if (res.success) {
        const newReviews = res.data || [];
        if (append) {
          setReviews((prev) => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }
        setTotal(res.pagination?.total || 0);
        setHasMore(res.pagination?.pages > pageNum);
        setPage(pageNum);
      }
    } catch (error) {
      console.log("Load reviews error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews(1, false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadReviews(page + 1, true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReviews(1, false);
    }, [userId])
  );

  const renderReviewItem = ({ item }) => (
    <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          {item.client?.profileImage ? (
            <Image source={{ uri: item.client.profileImage }} style={styles.reviewAvatar} />
          ) : (
            <View style={[styles.reviewAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={[styles.reviewAvatarText, { color: colors.textInverse }]}>
                {item.client?.name?.charAt(0) || "U"}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.reviewUserName, { color: colors.textPrimary }]}>
              {item.client?.name || "User"}
            </Text>
            <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Text style={[styles.reviewRating, { color: colors.warning }]}>
          {'⭐'.repeat(Math.floor(item.rating))}
        </Text>
      </View>
      {item.comment ? (
        <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
          {item.comment}
        </Text>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>📝</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No reviews yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {providerName || "This user"} hasn't received any reviews yet.
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Reviews
          </Text>
          <View style={styles.headerRight}>
            <Text style={[styles.reviewCount, { color: colors.textTertiary }]}>
              {total}
            </Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Reviews for {providerName || "this provider"}
        </Text>

        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
    alignItems: "center",
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    paddingLeft: 4,
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },
  reviewCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewRating: {
    fontSize: 14,
  },
  reviewComment: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});