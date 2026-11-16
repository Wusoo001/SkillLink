import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getUserReviews } from "../services/api";

const PAGE_SIZE = 10;

// ===== Star rating component =====
const StarRow = ({ rating, size = 14 }) => {
  const rounded = Math.round(rating || 0);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rounded ? "star" : "star-outline"}
          size={size}
          color="#F59E0B"
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  );
};

// ===== Safe date formatting =====
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ReviewsScreen({ navigation, route }) {
  const { userId, providerName } = route.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const isFirstFocusRef = useRef(true);

  const loadReviews = useCallback(
    async (pageNum = 1, append = false, { silent = false } = {}) => {
      if (!userId) {
        setLoading(false);
        return;
      }
      // Hard guard against concurrent load-more
      if (append && loadingMoreRef.current) return;

      const id = ++requestIdRef.current;
      if (!silent) {
        if (pageNum === 1) setLoading(true);
        else {
          loadingMoreRef.current = true;
          setLoadingMore(true);
        }
      }
      if (pageNum === 1) setLoadError(false);

      try {
        const res = await getUserReviews(userId, pageNum, PAGE_SIZE);
        if (id !== requestIdRef.current) return; // stale response

        if (res.success) {
          const incoming = res.data || [];
          if (append) {
            setReviews((prev) => {
              const seen = new Set(prev.map((r) => r._id));
              return [...prev, ...incoming.filter((r) => !seen.has(r._id))];
            });
          } else {
            setReviews(incoming);
          }
          const pages = res.pagination?.pages || 1;
          setTotal(res.pagination?.total || 0);
          setHasMore(pageNum < pages);
          setPage(pageNum);
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
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        loadReviews(1, false);
      } else {
        loadReviews(1, false, { silent: true });
      }
    }, [loadReviews])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadReviews(1, false, { silent: true });
  };

  const loadMore = () => {
    if (loading || loadingMoreRef.current || refreshing || !hasMore) return;
    loadReviews(page + 1, true);
  };

  const renderReviewItem = ({ item }) => (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.inputBorder,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          {item.client?.profileImage ? (
            <Image
              source={{ uri: item.client.profileImage }}
              style={[styles.reviewAvatar, { borderColor: colors.card }]}
            />
          ) : (
            <View
              style={[
                styles.reviewAvatarPlaceholder,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[styles.reviewAvatarText, { color: colors.textInverse }]}
              >
                {item.client?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View style={styles.reviewUserInfo}>
            <Text
              style={[styles.reviewUserName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.client?.name || "User"}
            </Text>
            <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.reviewRatingBlock}>
          <StarRow rating={item.rating} />
          <Text
            style={[styles.reviewRatingNumber, { color: colors.textPrimary }]}
          >
            {Number(item.rating || 0).toFixed(1)}
          </Text>
        </View>
      </View>

      {item.comment ? (
        <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
          {item.comment}
        </Text>
      ) : (
        <Text
          style={[
            styles.reviewComment,
            styles.reviewCommentEmpty,
            { color: colors.textTertiary },
          ]}
        >
          No comment
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loadError) {
      return (
        <View style={styles.emptyContainer}>
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
            Couldn't load reviews
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoadError(false);
              setLoading(true);
              loadReviews(1, false);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={colors.textInverse} />
            <Text style={[styles.retryBtnText, { color: colors.textInverse }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconWrap,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={colors.textTertiary}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No reviews yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          {providerName || "This user"} hasn't received any reviews yet.
        </Text>
      </View>
    );
  };

  // Only show footer loader when actually loading more — not persistently
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          Reviews
        </Text>
        <View style={styles.headerRight}>
          {total > 0 && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                {total}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text
        style={[styles.subtitle, { color: colors.textTertiary }]}
        numberOfLines={1}
      >
        {providerName ? `Reviews for ${providerName}` : "All reviews"}
      </Text>
    </>
  );

  // ===== INITIAL LOADING =====
  if (loading && reviews.length === 0) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
          {renderHeader()}
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {renderHeader()}

        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReviewItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    flex: 1,
  },
  headerRight: { minWidth: 40, alignItems: "flex-end" },
  countBadge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: 12.5, fontWeight: "800", letterSpacing: -0.2 },

  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 16,
    letterSpacing: 0.1,
  },

  listContent: { gap: 10, paddingTop: 2 },

  reviewCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  reviewAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 15, fontWeight: "800" },
  reviewUserInfo: { flex: 1 },
  reviewUserName: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  reviewDate: { fontSize: 11.5, fontWeight: "500" },
  reviewRatingBlock: { alignItems: "flex-end", gap: 3 },
  starRow: { flexDirection: "row", alignItems: "center" },
  reviewRatingNumber: { fontSize: 12, fontWeight: "700", letterSpacing: -0.1 },

  reviewComment: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  reviewCommentEmpty: { fontStyle: "italic", fontSize: 13 },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 16,
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

  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
  footerLoader: { paddingVertical: 18, alignItems: "center" },
});