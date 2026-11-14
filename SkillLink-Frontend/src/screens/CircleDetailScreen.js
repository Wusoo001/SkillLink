import React, { useState, useCallback, useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import {
  getCircleById,
  joinCircle,
  leaveCircle,
  getCircleRequests,
} from "../services/api";

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function CircleDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { circleId, circleName } = route.params || {};

  const [circle, setCircle] = useState(null);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("open"); // "open" | "resolved"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);

  const load = async () => {
    try {
      const [circleRes, requestsRes] = await Promise.all([
        getCircleById(circleId),
        getCircleRequests(circleId, tab === "resolved", 1, 20),
      ]);
      if (circleRes?.success) setCircle(circleRes.data);
      if (requestsRes?.success) setRequests(requestsRes.data || []);
    } catch (error) {
      console.log("Load circle detail error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [circleId, tab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleToggleMembership = async () => {
    if (!circle || membershipLoading) return;
    setMembershipLoading(true);
    try {
      if (circle.isMember) {
        await leaveCircle(circle._id);
        setCircle({ ...circle, isMember: false, memberCount: Math.max(0, circle.memberCount - 1) });
      } else {
        await joinCircle(circle._id);
        setCircle({ ...circle, isMember: true, memberCount: circle.memberCount + 1 });
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not update membership");
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleOpenRequest = (request) => {
    navigation.navigate("RequestDetail", {
      circleId: circleId,
      circleName: circle?.name || circleName,
      requestId: request._id,
    });
  };

  const renderRequest = ({ item }) => (
    <TouchableOpacity
      style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
      onPress={() => handleOpenRequest(item)}
      activeOpacity={0.85}
    >
      <View style={styles.requestHeader}>
        <View style={[styles.categoryChip, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.categoryChipText, { color: colors.primary }]}>
            {item.category}
          </Text>
        </View>
        <Text style={[styles.requestTime, { color: colors.textTertiary }]}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.requestTitle, { color: colors.textPrimary }]} numberOfLines={2}>
        {item.title}
      </Text>
      {item.description ? (
        <Text
          style={[styles.requestDesc, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      ) : null}
      <View style={styles.requestFooter}>
        <View style={styles.requestAuthor}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.textInverse }]}>
              {item.author?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <Text style={[styles.authorName, { color: colors.textTertiary }]} numberOfLines={1}>
            {item.author?.name || "Someone"}
          </Text>
        </View>
        <View style={styles.replyCount}>
          <Ionicons
            name="chatbubble-outline"
            size={13}
            color={colors.textTertiary}
          />
          <Text style={[styles.replyCountText, { color: colors.textTertiary }]}>
            {item.replyCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {circleName || "Circle"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Circle</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary }}>Circle not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {circle.name}
        </Text>
        <TouchableOpacity
          style={[
            styles.membershipBtn,
            {
              backgroundColor: circle.isMember ? colors.inputBackground : colors.primary,
              borderColor: circle.isMember ? colors.inputBorder : colors.primary,
            },
          ]}
          onPress={handleToggleMembership}
          disabled={membershipLoading}
        >
          <Text
            style={[
              styles.membershipBtnText,
              { color: circle.isMember ? colors.textPrimary : colors.textInverse },
            ]}
          >
            {membershipLoading
              ? "..."
              : circle.isMember
              ? "Leave"
              : "Join"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={[styles.subHeaderText, { color: colors.textTertiary }]}>
          {circle.memberCount} member{circle.memberCount !== 1 ? "s" : ""} ·{" "}
          {circle.requestCount} request{circle.requestCount !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        {[
          { key: "open", label: "Open" },
          { key: "resolved", label: "Resolved" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && { backgroundColor: colors.primary }]}
            onPress={() => setTab(t.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t.key ? colors.textInverse : colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {tab === "resolved" ? "No resolved requests yet" : "No open requests"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              {tab === "resolved"
                ? "Requests marked as resolved will appear here."
                : circle.isMember
                ? "Be the first to ask your neighbors for a recommendation."
                : "Join this circle to start posting requests."}
            </Text>
          </View>
        }
      />

      {/* FAB — only for members */}
      {circle.isMember && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              bottom: insets.bottom + 24,
            },
          ]}
          onPress={() =>
            navigation.navigate("CreateRequest", {
              circleId: circle._id,
              circleName: circle.name,
            })
          }
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color={colors.textInverse} />
        </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  membershipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  membershipBtnText: { fontSize: 13, fontWeight: "700" },
  subHeader: { paddingHorizontal: 20, marginBottom: 14 },
  subHeaderText: { fontSize: 12, fontWeight: "500" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
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
  },
  tabText: { fontSize: 12.5, fontWeight: "700" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  requestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  requestTime: { fontSize: 11, fontWeight: "500" },
  requestTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20, marginBottom: 6 },
  requestDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  requestFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestAuthor: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 10, fontWeight: "800" },
  authorName: { fontSize: 11.5, fontWeight: "500" },
  replyCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyCountText: { fontSize: 11.5, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 12.5, textAlign: "center", lineHeight: 18, maxWidth: 280 },
  fab: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
});