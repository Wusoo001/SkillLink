import React, { useState, useCallback, useContext, useRef, useEffect } from "react";
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
  Image,
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

const SEARCH_DEBOUNCE_MS = 350;

const webAlert = (title, message) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message || ""}`);
  else Alert.alert(title, message || "");
};

const webConfirm = (title, message, onConfirm) => {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm },
  ]);
};

const timeAgo = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
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
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [recommendedUser, setRecommendedUser] = useState(null);

  // Provider picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const requestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const searchTimeoutRef = useRef(null);
  const isFirstFocusRef = useRef(true);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!circleId || !requestId) {
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
        const res = await getCircleRequest(circleId, requestId);
        if (id !== requestIdRef.current) return;

        if (res?.success && res.data) {
          setRequest(res.data);
          setLoadError(false);
          setNotFound(false);
        } else if (res && res.success === false) {
          setNotFound(true);
        } else {
          setLoadError(true);
        }
      } catch (error) {
        if (id !== requestIdRef.current) return;
        if (error?.response?.status === 404) setNotFound(true);
        else setLoadError(true);
      } finally {
        if (id === requestIdRef.current && !silent) setLoading(false);
      }
    },
    [circleId, requestId]
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        load();
      } else {
        load({ silent: true });
      }
    }, [load])
  );

  const isAuthor =
    request && user && String(request.author?._id) === String(user._id);
  const isResolved = !!request?.isResolved;

  const handleResolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await resolveCircleRequest(circleId, requestId);
      await load({ silent: true });
    } catch (error) {
      webAlert(
        "Error",
        error.response?.data?.message || "Could not update request"
      );
    } finally {
      setResolving(false);
    }
  };

  const handleDeleteRequest = () => {
    if (deleting) return;
    webConfirm(
      "Delete Request",
      "Delete this request and all replies? This cannot be undone.",
      async () => {
        setDeleting(true);
        try {
          await deleteCircleRequest(circleId, requestId);
          navigation.goBack();
        } catch (error) {
          webAlert(
            "Error",
            error.response?.data?.message || "Could not delete request"
          );
        } finally {
          setDeleting(false);
        }
      }
    );
  };

  const handleSubmitReply = async () => {
    if (submitting) return;
    if (replyText.trim().length < 5) {
      webAlert("Too short", "Reply must be at least 5 characters.");
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
      await load({ silent: true });
    } catch (error) {
      webAlert(
        "Couldn't post reply",
        error.response?.data?.message || "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = (reply) => {
    webConfirm("Delete Reply", "Remove this reply?", async () => {
      try {
        await deleteCircleReply(circleId, requestId, reply._id);
        await load({ silent: true });
      } catch (error) {
        webAlert(
          "Error",
          error.response?.data?.message || "Could not delete reply"
        );
      }
    });
  };

  const handleSearchUsers = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const id = ++searchRequestIdRef.current;
    setSearching(true);
    try {
      const res = await searchUsers(query.trim(), 10);
      if (id !== searchRequestIdRef.current) return;
      if (res?.success) {
        // Exclude self from results — you can't recommend yourself
        const filtered = (res.data || []).filter(
          (u) => String(u._id) !== String(user?._id || "")
        );
        setSearchResults(filtered);
      }
    } catch {
      if (id === searchRequestIdRef.current) setSearchResults([]);
    } finally {
      if (id === searchRequestIdRef.current) setSearching(false);
    }
  }, [user?._id]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      handleSearchUsers(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, handleSearchUsers]);

  const pickRecommendedUser = (u) => {
    setRecommendedUser(u);
    setPickerOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleBack = () => {
    if (replyText.trim().length > 0 || recommendedUser) {
      webConfirm(
        "Discard reply?",
        "You've typed a reply. Leaving now will lose it.",
        () => navigation.goBack()
      );
      return;
    }
    navigation.goBack();
  };

  // ===== RENDER REPLY =====
  const renderReply = ({ item }) => {
    const isMyReply =
      user && String(item.author?._id) === String(user._id);
    const rec = item.recommendedUser;
    const recInitial = rec?.name?.charAt(0)?.toUpperCase() || "U";

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
              <Text
                style={[styles.authorName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.author?.name || "Someone"}
              </Text>
              <Text style={[styles.replyTime, { color: colors.textTertiary }]}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
          {isMyReply && (
            <TouchableOpacity
              onPress={() => handleDeleteReply(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.replyText, { color: colors.textPrimary }]}>
          {item.text}
        </Text>

        {/* FIXED: proper image rendering */}
        {rec && rec._id ? (
          <TouchableOpacity
            style={[
              styles.providerCard,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary + "40",
              },
            ]}
            onPress={() =>
              navigation.navigate("UsersProfile", { userId: rec._id })
            }
            activeOpacity={0.85}
          >
            {rec.profileImage ? (
              <Image
                source={{ uri: rec.profileImage }}
                style={styles.providerAvatarImage}
              />
            ) : (
              <View
                style={[styles.providerAvatar, { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.providerAvatarText,
                    { color: colors.textInverse },
                  ]}
                >
                  {recInitial}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.providerNameRow}>
                <Text
                  style={[styles.providerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {rec.name}
                </Text>
                {rec.isVerified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={colors.primary}
                  />
                )}
              </View>
              <View style={styles.providerMetaRow}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={[styles.providerMeta, { color: colors.textTertiary }]}>
                  {Number(rec.rating || 0).toFixed(1)} ·{" "}
                  {rec.jobsCompleted || 0} jobs
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // ===== INITIAL LOADING =====
  if (loading) {
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
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            Request
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
            Request
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <View
            style={[
              styles.errorIconWrap,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={32}
              color={colors.textTertiary}
            />
          </View>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Request not found
          </Text>
          <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
            This request may have been deleted.
          </Text>
        </View>
      </View>
    );
  }

  // ===== ERROR =====
  if (loadError || !request) {
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
            Request
          </Text>
          <View style={{ width: 40 }} />
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
            Couldn't load request
          </Text>
          <Text style={[styles.errorSub, { color: colors.textTertiary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoadError(false);
              setLoading(true);
              load();
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

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {circleName || "Request"}
        </Text>
        {isAuthor ? (
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                opacity: deleting ? 0.5 : 1,
              },
            ]}
            onPress={handleDeleteRequest}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            )}
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
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View
            style={[
              styles.requestCard,
              {
                backgroundColor: colors.card,
                borderColor: isResolved
                  ? colors.success + "40"
                  : colors.inputBorder,
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.requestTopRow}>
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text
                  style={[styles.categoryChipText, { color: colors.primary }]}
                >
                  {request.category}
                </Text>
              </View>
              {isResolved && (
                <View
                  style={[
                    styles.resolvedBadge,
                    { backgroundColor: colors.success + "15" },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color={colors.success}
                  />
                  <Text
                    style={[styles.resolvedText, { color: colors.success }]}
                  >
                    Resolved
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.requestTitle, { color: colors.textPrimary }]}>
              {request.title}
            </Text>

            {request.description ? (
              <Text
                style={[styles.requestDesc, { color: colors.textSecondary }]}
              >
                {request.description}
              </Text>
            ) : null}

            <View style={styles.requestAuthor}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text
                  style={[styles.avatarText, { color: colors.textInverse }]}
                >
                  {request.author?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View>
                <Text
                  style={[styles.authorName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {request.author?.name || "Someone"}
                </Text>
                <Text
                  style={[styles.replyTime, { color: colors.textTertiary }]}
                >
                  {timeAgo(request.createdAt)} · {request.replyCount} repl
                  {request.replyCount === 1 ? "y" : "ies"}
                </Text>
              </View>
            </View>

            {isAuthor && !isResolved && (
              <TouchableOpacity
                style={[
                  styles.resolveBtn,
                  {
                    backgroundColor: colors.success,
                    opacity: resolving ? 0.7 : 1,
                  },
                ]}
                onPress={handleResolve}
                disabled={resolving}
                activeOpacity={0.85}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={colors.textInverse}
                    />
                    <Text
                      style={[
                        styles.resolveBtnText,
                        { color: colors.textInverse },
                      ]}
                    >
                      Mark as Resolved
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isAuthor && isResolved && (
              <TouchableOpacity
                style={[
                  styles.reopenBtn,
                  {
                    borderColor: colors.inputBorder,
                    opacity: resolving ? 0.5 : 1,
                  },
                ]}
                onPress={handleResolve}
                disabled={resolving}
                activeOpacity={0.85}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text
                    style={[
                      styles.reopenBtnText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Reopen Request
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="chatbubbles-outline"
              size={36}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {isResolved
                ? "This request is resolved. No replies were posted."
                : "No replies yet. Be the first to recommend someone."}
            </Text>
          </View>
        }
      />

      {!isAuthor && !isResolved && (
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
            <View
              style={[
                styles.recommendedPreview,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="person-circle" size={18} color={colors.primary} />
              <Text
                style={[
                  styles.recommendedPreviewText,
                  { color: colors.primary },
                ]}
                numberOfLines={1}
              >
                Recommending: {recommendedUser.name}
              </Text>
              <TouchableOpacity onPress={() => setRecommendedUser(null)}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.composerRow}>
            <TouchableOpacity
              style={[styles.attachBtn, { borderColor: colors.inputBorder }]}
              onPress={() => setPickerOpen(true)}
              disabled={submitting}
            >
              <Ionicons
                name="person-add-outline"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.replyInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Recommend someone..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
              editable={!submitting}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !replyText.trim() || submitting ? 0.5 : 1,
                },
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

      {/* PROVIDER PICKER MODAL */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContainer, { backgroundColor: colors.card }]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.inputBorder },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: colors.textPrimary }]}
              >
                Recommend a Provider
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchWrap,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name..."
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 400 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.resultRow,
                    { borderBottomColor: colors.inputBorder },
                  ]}
                  onPress={() => pickRecommendedUser(item)}
                  activeOpacity={0.85}
                >
                  {item.profileImage ? (
                    <Image
                      source={{ uri: item.profileImage }}
                      style={styles.resultAvatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.resultAvatar,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultAvatarText,
                          { color: colors.textInverse },
                        ]}
                      >
                        {item.name?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.resultNameRow}>
                      <Text
                        style={[
                          styles.resultName,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.isVerified && (
                        <Ionicons
                          name="checkmark-circle"
                          size={13}
                          color={colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.resultMetaRow}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text
                        style={[
                          styles.resultMeta,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {Number(item.rating || 0).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={[styles.emptySearch, { color: colors.textTertiary }]}
                >
                  {searchQuery.trim().length < 2
                    ? "Type at least 2 characters to search."
                    : searching
                    ? "Searching..."
                    : "No matches found."}
                </Text>
              }
            />
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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

  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  requestCard: { borderRadius: 18, padding: 16, marginBottom: 16 },
  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
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
  requestTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
    marginBottom: 8,
  },
  requestDesc: { fontSize: 13.5, lineHeight: 19, marginBottom: 14 },
  requestAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
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
  providerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  providerAvatarText: { fontSize: 13, fontWeight: "800" },
  providerNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  providerName: { fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
  providerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  providerMeta: { fontSize: 11, fontWeight: "500" },

  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: {
    fontSize: 12.5,
    marginTop: 10,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },

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
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
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
  resultAvatarImage: { width: 38, height: 38, borderRadius: 19 },
  resultAvatarText: { fontSize: 14, fontWeight: "800" },
  resultNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  resultName: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  resultMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  resultMeta: { fontSize: 11.5, fontWeight: "500" },
  emptySearch: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 30,
    fontWeight: "500",
  },
});