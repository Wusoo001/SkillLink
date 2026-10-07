import { useNavigation, useRoute } from "@react-navigation/native";
import { useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { getPosts, api, deletePost, savePost, likePost, unlikePost } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { isUserActive } from "../utils/helpers";
import ReportModal from "./ReportModal"; // ✅ NEW

// ==============================
// VideoItem — replaces expo-av Video (hook must live per-item)
// ==============================
const VideoItem = ({ uri, style }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls
    />
  );
};

// ==============================
// PostItem Component (UI polished, logic identical)
// ==============================
const PostItem = ({
  item,
  userId,
  isOwnPost,
  onEdit,
  onDelete,
  colors,
  isLiked,
  likesCount,
  onLikePress,
  isSaved,
  onSavePress,
}) => {
  const navigation = useNavigation();
  const bookScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(bookScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(bookScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
        onDelete(item._id);
      }
    } else {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDelete(item._id) },
        ]
      );
    }
  };

  const goToAllReviews = () => {
    navigation.navigate("ReviewsScreen", {
      userId: userId,
      providerName: item.user?.name || "Provider",
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.inputBorder,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {/* Description + actions */}
      <View style={styles.postHeader}>
        <Text
          style={[styles.description, { color: colors.textPrimary }]}
          numberOfLines={3}
        >
          {item.description}
        </Text>
        {isOwnPost && (
          <View style={styles.postActions}>
            <TouchableOpacity
              onPress={() => onEdit(item)}
              style={styles.actionIcon}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.actionIcon}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Media */}
      {item.media && item.mediaType === "image" && (
        <Image source={{ uri: item.media }} style={styles.mediaImage} resizeMode="cover" />
      )}
      {item.media && item.mediaType === "video" && (
        <VideoItem uri={item.media} style={styles.mediaVideo} />
      )}

      {/* Tags */}
      {item.tags?.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((tag, idx) => (
            <View
              key={idx}
              style={[styles.tag, { backgroundColor: colors.primaryLight }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]} numberOfLines={1}>
                #{tag}
              </Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={[styles.moreTagsText, { color: colors.textTertiary }]}>
              +{item.tags.length - 3}
            </Text>
          )}
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

      {/* Actions row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLikePress(item._id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? colors.danger : colors.textSecondary}
          />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            {likesCount > 0 ? likesCount : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={goToAllReviews}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            {item.reviewCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionRight]}
          onPress={() => onSavePress(item._id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={isSaved ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: isSaved ? colors.primary : colors.textPrimary },
            ]}
          >
            {isSaved ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Book CTA */}
      <Animated.View style={{ transform: [{ scale: bookScale }] }}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
          ]}
          onPress={() =>
            navigation.navigate("BookingScreen", {
              providerId: userId,
              providerName: item.user?.name || "Provider",
              serviceTitle: item.description,
              price: item.price,
              description: item.description,
              postId: item._id,
            })
          }
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Text style={styles.bookButtonText}>Book This Service</Text>
          <View style={styles.bookPricePill}>
            <Text style={styles.bookPriceText}>
              ₦{item.price?.toLocaleString?.() ?? item.price}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ==============================
// Main UserProfileScreen
// ==============================
export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { user, loading: authLoading, logout } = useContext(AuthContext);
  const { colors } = useTheme();
  const { userId: routeUserId } = route.params || {};
  const resolvedUserId = routeUserId || user?._id;

  const [userPosts, setUserPosts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);

  // ✅ NEW: report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const isOwnProfile = user?._id === resolvedUserId;
  const userActive = isUserActive(userInfo?.lastActive);

  // ===== LOAD USER DATA =====
  const loadUserData = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setUserInfo(res.data);
      const postsRes = await getPosts(1, 20);
      if (postsRes?.success) {
        const posts = postsRes.posts || [];
        const filtered = posts.filter((post) => post?.user?._id === id);
        setUserPosts(filtered);
        setResetKey((prev) => prev + 1);
      }
    } catch (error) {
      console.log("User profile load error:", error);
      setUserInfo(null);
      setUserPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!resolvedUserId) return;
    setRefreshing(true);
    await loadUserData(resolvedUserId);
    setRefreshing(false);
  }, [resolvedUserId]);

  useEffect(() => {
    if (resolvedUserId) loadUserData(resolvedUserId);
  }, [resolvedUserId]);

  useFocusEffect(
    useCallback(() => {
      if (resolvedUserId) loadUserData(resolvedUserId);
    }, [resolvedUserId])
  );

  // ===== EDIT & DELETE =====
  const handleEditPost = (post) => {
    navigation.navigate("CreatePostScreen", { editPost: post });
  };

  const handleDeletePost = async (postId) => {
    try {
      await deletePost(postId);
      setUserPosts((prev) => prev.filter((p) => p._id !== postId));
      Alert.alert("Deleted", "Post deleted successfully.");
    } catch (error) {
      Alert.alert("Error", "Could not delete post.");
    }
  };

  // ===== LIKE =====
  const toggleLike = async (postId) => {
    const isLiked = likedPosts.includes(postId);
    setLikedPosts((prev) =>
      isLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    setUserPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? {
              ...post,
              likesCount: isLiked ? (post.likesCount || 1) - 1 : (post.likesCount || 0) + 1,
            }
          : post
      )
    );
    try {
      if (isLiked) await unlikePost(postId);
      else await likePost(postId);
    } catch (error) {
      await loadUserData(resolvedUserId);
    }
  };

  // ===== SAVE =====
  const toggleSave = async (postId) => {
    try {
      await savePost(postId);
      if (savedPosts.includes(postId)) {
        setSavedPosts(savedPosts.filter((id) => id !== postId));
      } else {
        setSavedPosts([...savedPosts, postId]);
      }
    } catch (error) {
      Alert.alert("Error", "Could not save post.");
    }
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
  // Web doesn't support Alert.alert — use window.confirm
  if (Platform.OS === "web") {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) logout();
    return;
  }

  Alert.alert(
    "Log Out",
    "Are you sure you want to log out?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]
  );
};

  if (loading || authLoading || !resolvedUserId) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ===== PROFILE HEADER =====
  const ProfileHeader = () => (
    <View style={styles.profileSection}>
      {/* Back + actions row */}
      <View style={styles.backRow}>
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

        {/* Right side: Settings + Logout (own) OR Report (other) */}
        {isOwnProfile ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Settings */}
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: colors.card, borderColor: colors.inputBorder },
              ]}
              onPress={() => navigation.navigate("Settings")}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: colors.card, borderColor: colors.inputBorder },
              ]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
            onPress={() => setReportModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flag-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar + name + bio row */}
      <View style={styles.profileTop}>
        <View style={styles.avatarWrap}>
          {userInfo?.profileImage ? (
            <Image
              source={{ uri: userInfo.profileImage }}
              style={[styles.avatarImage, { borderColor: colors.card }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary, borderColor: colors.card },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {userInfo?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.avatarStatusDot,
              {
                backgroundColor: userActive ? "#22C55E" : "#94A3B8",
                borderColor: colors.card,
              },
            ]}
          />
        </View>

        <View style={styles.profileInfo}>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {userInfo?.name || "User"}
          </Text>
          {userInfo?.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
              <Text
                style={[styles.locationText, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {userInfo.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Bio */}
      <Text
        style={[styles.bio, { color: colors.textSecondary }]}
        numberOfLines={3}
      >
        {userInfo?.bio || "No description provided"}
      </Text>

      {/* Stats + Edit button row */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statsBox,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {Number(userInfo?.rating || 0).toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Rating</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.inputBorder }]} />

          <View style={styles.statItem}>
            <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {userInfo?.jobsCompleted || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Jobs</Text>
          </View>
        </View>

        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("EditProfile", { userInfo })}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={15} color={colors.textInverse} />
            <Text style={[styles.editButtonText, { color: colors.textInverse }]}>
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ===== SECTION HEADER =====
  const SectionHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Services
      </Text>
      <View
        style={[styles.sectionBadge, { backgroundColor: colors.primaryLight }]}
      >
        <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>
          {userPosts.length}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <FlatList
          key={resetKey}
          data={userPosts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PostItem
              item={item}
              userId={resolvedUserId}
              isOwnPost={isOwnProfile && item.user?._id === user?._id}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              colors={colors}
              isLiked={likedPosts.includes(item._id)}
              likesCount={item.likesCount || 0}
              onLikePress={toggleLike}
              isSaved={savedPosts.includes(item._id)}
              onSavePress={toggleSave}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <ProfileHeader />
              <SectionHeader />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <Ionicons name="cube-outline" size={28} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No services yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                {isOwnProfile
                  ? "Create your first service post"
                  : "This user hasn't posted any services"}
              </Text>
            </View>
          }
          style={{ flex: 1 }}
        />
      </View>

      {/* ✅ Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        type="user"
        targetId={resolvedUserId}
      />
    </View>
  );
}

// ========================================
// STYLES (unchanged)
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
  },
  avatarText: { fontSize: 28, fontWeight: "800" },
  avatarStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  profileInfo: { flex: 1 },
  name: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText: { fontSize: 12.5, fontWeight: "500" },

  bio: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "400",
    marginBottom: 14,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statsBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    flex: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statDivider: { width: 1, height: 28 },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  editButtonText: { fontWeight: "700", fontSize: 13.5 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionBadge: {
    minWidth: 26,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeText: { fontSize: 12.5, fontWeight: "800" },

  listContent: {
    paddingBottom: 110,
    minHeight: "100%",
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "400",
    flex: 1,
  },
  postActions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 10,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  mediaImage: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },
  mediaVideo: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 14,
    marginBottom: 10,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontSize: 11.5, fontWeight: "600" },
  moreTagsText: { fontSize: 12, fontWeight: "600", marginLeft: 2 },

  divider: { height: 1, marginBottom: 8 },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  actionRight: { marginLeft: "auto" },
  actionButtonText: { fontWeight: "600", fontSize: 13.5 },

  bookButton: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  bookPricePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  bookPriceText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12.5,
  },

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
  emptyTitle: { fontSize: 16.5, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
  },
});