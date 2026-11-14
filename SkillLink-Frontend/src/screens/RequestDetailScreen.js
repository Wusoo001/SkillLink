import React, { useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  getCircleRequest,
  resolveCircleRequest,
  deleteCircleRequest,
  createCircleReply,
  deleteCircleReply,
  searchUsers,
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

export default function RequestDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const { circleId, requestId, circleName } = route.params || {};

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [recommendedUser, setRecommendedUser] = useState(null);

  // Provider picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    try {
      const res = await getCircleRequest(circleId, requestId);
      if (res?.success) setRequest(res.data);
    } catch (error) {
      console.log("Load request error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [circleId, requestId])
  );

  const isAuthor = request && user && String(request.author?._id) === String(user._id);

  const handleResolve = async () => {
    try {
      await resolveCircleRequest(circleId, requestId);
      await load();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not update");
    }
  };

  const handleDeleteRequest = () => {
    Alert.alert(
      "Delete Request",
      "Delete this request and all replies? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCircleRequest(circleId, requestId);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", error.response?.data?.message || "Could not delete");
            }
          },
        },
      ]
    );
  };

  const handleSubmitReply = async () => {
    if (replyText.trim().length < 5) {
      Alert.alert("Too short", "Reply must be at least 5 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await createCircleReply(circleId, requestId, {
        text: replyText.trim(),
        recommendedUserId: recommendedUser?._id || undefined,
      });
      setReplyText("");
      setRecommendedUser(null);
      await load();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = (reply) => {
    Alert.alert("Delete Reply", "Remove this reply?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCircleReply(circleId, requestId, reply._id);
            await load();
          } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Could not delete");
          }
        },
      },
    ]);
  };

  const handleSearchUsers = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchUsers(searchQuery.trim(), 10);
      if (res?.success) setSearchResults(res.data || []);
    } finally {
      setSearching(false);
    }
  };

  const pickRecommendedUser = (u) => {
    setRecommendedUser(u);
    setPickerOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const renderReply = ({ item }) => {
    const isMyReply = user && String(item.author?._id) === String(user._id);
    return (
      <View
        style={[
          styles.replyCard,
          { backgroundColor: colors.card, borderColor: colors.inputBorder },
        ]}
      >
        <View style={styles.replyHeader}>
          <View style={styles.replyAuthor}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {item.author?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <View>
              <Text style={[styles.authorName, { color: colors.textPrimary }]}>
                {item.author?.name || "Someone"}
              </Text>
              <Text style={[styles.replyTime, { color: colors.textTertiary }]}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
          {isMyReply && (
            <TouchableOpacity onPress={() => handleDeleteReply(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.replyText, { color: colors.textPrimary }]}>
          {item.text}
        </Text>

        {item.recommendedUser ? (
          <TouchableOpacity
            style={[styles.providerCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "40" }]}
            onPress={() =>
              navigation.navigate("UsersProfile", { userId: item.recommendedUser._id })
            }
            activeOpacity={0.85}
          >
            {item.recommendedUser.profileImage ? (
              <View style={{ width: 36, height: 36, borderRadius: 18, overflow: "hidden" }}>
                <Text> </Text>
              </View>
            ) : (
              <View style={[styles.providerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.providerAvatarText, { color: colors.textInverse }]}>
                  {item.recommendedUser.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[styles.providerName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.recommendedUser.name}
                </Text>
                {item.recommendedUser.isVerified && (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.providerMeta, { color: colors.textTertiary }]}>
                ⭐ {Number(item.recommendedUser.rating || 0).toFixed(1)} ·{" "}
                {item.recommendedUser.jobsCompleted || 0} jobs
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Request</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Request</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary }}>Request not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {circleName || "Request"}
        </Text>
        {isAuthor ? (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={handleDeleteRequest}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        data={request.replies || []}
        keyExtractor={(item) => item._id}
        renderItem={renderReply}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View
            style={[
              styles.requestCard,
              {
                backgroundColor: colors.card,
                borderColor: request.isResolved ? colors.success + "40" : colors.inputBorder,
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.requestTopRow}>
              <View style={[styles.categoryChip, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.categoryChipText, { color: colors.primary }]}>
                  {request.category}
                </Text>
              </View>
              {request.isResolved && (
                <View style={[styles.resolvedBadge, { backgroundColor: colors.success + "15" }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[styles.resolvedText, { color: colors.success }]}>Resolved</Text>
                </View>
              )}
            </View>

            <Text style={[styles.requestTitle, { color: colors.textPrimary }]}>
              {request.title}
            </Text>

            {request.description ? (
              <Text style={[styles.requestDesc, { color: colors.textSecondary }]}>
                {request.description}
              </Text>
            ) : null}

            <View style={styles.requestAuthor}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                  {request.author?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View>
                <Text style={[styles.authorName, { color: colors.textPrimary }]}>
                  {request.author?.name || "Someone"}
                </Text>
                <Text style={[styles.replyTime, { color: colors.textTertiary }]}>
                  {timeAgo(request.createdAt)} · {request.replyCount} repl
                  {request.replyCount === 1 ? "y" : "ies"}
                </Text>
              </View>
            </View>

            {isAuthor && !request.isResolved && (
              <TouchableOpacity
                style={[styles.resolveBtn, { backgroundColor: colors.success }]}
                onPress={handleResolve}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.textInverse} />
                <Text style={[styles.resolveBtnText, { color: colors.textInverse }]}>
                  Mark as Resolved
                </Text>
              </TouchableOpacity>
            )}

            {isAuthor && request.isResolved && (
              <TouchableOpacity
                style={[styles.reopenBtn, { borderColor: colors.inputBorder }]}
                onPress={handleResolve}
                activeOpacity={0.85}
              >
                <Text style={[styles.reopenBtnText, { color: colors.textSecondary }]}>
                  Reopen Request
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No replies yet. Be the first to recommend someone.
            </Text>
          </View>
        }
      />

      {/* Reply composer — only if not author and not resolved */}
      {!isAuthor && !request.isResolved && (
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.inputBorder,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {recommendedUser && (
            <View style={[styles.recommendedPreview, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person-circle" size={18} color={colors.primary} />
              <Text style={[styles.recommendedPreviewText, { color: colors.primary }]} numberOfLines={1}>
                Recommending: {recommendedUser.name}
              </Text>
              <TouchableOpacity onPress={() => setRecommendedUser(null)}>
                <Ionicons name="close-circle" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.composerRow}>
            <TouchableOpacity
              style={[styles.attachBtn, { borderColor: colors.inputBorder }]}
              onPress={() => setPickerOpen(true)}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.replyInput,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
              ]}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Recommend someone..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: colors.primary, opacity: !replyText.trim() || submitting ? 0.5 : 1 },
              ]}
              onPress={handleSubmitReply}
              disabled={!replyText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="send" size={16} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Provider picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.inputBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Recommend a Provider
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchWrap,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name..."
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={handleSearchUsers}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={handleSearchUsers}>
                <Text style={[styles.searchBtnText, { color: colors.primary }]}>Search</Text>
              </TouchableOpacity>
            </View>

            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.resultRow, { borderBottomColor: colors.inputBorder }]}
                    onPress={() => pickRecommendedUser(item)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.resultAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.resultAvatarText, { color: colors.textInverse }]}>
                        {item.name?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.isVerified && (
                          <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                        )}
                      </View>
                      <Text style={[styles.resultMeta, { color: colors.textTertiary }]}>
                        ⭐ {Number(item.rating || 0).toFixed(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.trim().length < 2 ? (
                    <Text style={[styles.emptySearch, { color: colors.textTertiary }]}>
                      Type at least 2 characters to search.
                    </Text>
                  ) : (
                    <Text style={[styles.emptySearch, { color: colors.textTertiary }]}>
                      No matches found.
                    </Text>
                  )
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  requestCard: { borderRadius: 18, padding: 16, marginBottom: 16 },
  requestTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resolvedText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.2 },
  requestTitle: { fontSize: 17, fontWeight: "800", lineHeight: 23, marginBottom: 8 },
  requestDesc: { fontSize: 13.5, lineHeight: 19, marginBottom: 14 },
  requestAuthor: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "800" },
  authorName: { fontSize: 13, fontWeight: "700" },
  replyTime: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 14,
  },
  resolveBtnText: { fontSize: 13.5, fontWeight: "700" },
  reopenBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 14,
  },
  reopenBtnText: { fontSize: 13, fontWeight: "600" },
  replyCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  replyAuthor: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  replyText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  providerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: { fontSize: 13, fontWeight: "800" },
  providerName: { fontSize: 13.5, fontWeight: "700" },
  providerMeta: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 12.5, marginTop: 10, textAlign: "center", maxWidth: 260 },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  recommendedPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  recommendedPreviewText: { fontSize: 12, fontWeight: "700", flex: 1 },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  searchBtnText: { fontSize: 13, fontWeight: "700" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  resultAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  resultAvatarText: { fontSize: 14, fontWeight: "800" },
  resultName: { fontSize: 14, fontWeight: "700" },
  resultMeta: { fontSize: 11.5, fontWeight: "500", marginTop: 1 },
  emptySearch: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 30,
    fontWeight: "500",
  },
});