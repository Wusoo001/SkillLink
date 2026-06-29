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
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { getPosts, api, deletePost, savePost, likePost, unlikePost } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { isUserActive } from "../utils/helpers";

// ==============================
// PostItem Component (with review icon)
// ==============================
const PostItem = ({
  item,
  userId, // provider ID (used for booking and reviews)
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
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
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

  // Navigate to ReviewsScreen with provider ID and name
  const goToAllReviews = () => {
    navigation.navigate("ReviewsScreen", {
      userId: userId,
      providerName: item.user?.name || "Provider",
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
      <View style={styles.postHeader}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
        {isOwnPost && (
          <View style={styles.postActions}>
            <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionIcon}>
              <Ionicons name="pencil-outline" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionIcon}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.media && item.mediaType === "image" && (
        <Image source={{ uri: item.media }} style={styles.mediaImage} />
      )}
      {item.media && item.mediaType === "video" && (
        <Video
          source={{ uri: item.media }}
          style={styles.mediaVideo}
          useNativeControls
          resizeMode="cover"
        />
      )}
      <View style={styles.tagContainer}>
        {item.tags?.map((tag, idx) => (
          <View key={idx} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
          </View>
        ))}
      </View>

      {/* ===== ACTION ROW with Review Icon ===== */}
      <View style={styles.actionRow}>
        {/* Like Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.gray }]}
          onPress={() => onLikePress(item._id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? colors.danger : colors.textTertiary}
          />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            {likesCount > 0 ? likesCount : ""}
          </Text>
        </TouchableOpacity>

        {/* NEW: Reviews Icon with Count */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.gray }]}
          onPress={goToAllReviews}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={colors.textTertiary}
          />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            {item.reviewCount || 0}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.gray }]}
          onPress={() => onSavePress(item._id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
            {isSaved ? "❤️ Saved" : "🤍 Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Book Button */}
      <Animated.View style={{ transform: [{ scale: bookScale }] }}>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          onPress={() =>
            navigation.navigate("BookingScreen", {
              providerId: userId,
              providerName: item.user?.name || "Provider",
              serviceTitle: item.description,
              price: item.price,
              description: item.description,
            })
          }
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Text style={[styles.bookButtonText, { color: colors.textInverse }]}>Book This Service</Text>
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

  const { user, loading: authLoading } = useContext(AuthContext);
  const { colors } = useTheme();
  const { userId: routeUserId } = route.params || {};
  const resolvedUserId = routeUserId || user?._id;

  const [userPosts, setUserPosts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Like & Save state
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);

  const isOwnProfile = user?._id === resolvedUserId;
  const userActive = isUserActive(userInfo?.lastActive);

  // Load user data
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

  // Edit & Delete handlers
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

  // Like handler
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
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      await loadUserData(resolvedUserId);
    }
  };

  // Save handler
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

  if (loading || authLoading || !resolvedUserId) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Profile Header (unchanged)
  const ProfileHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
      {userInfo?.profileImage ? (
        <Image source={{ uri: userInfo.profileImage }} style={[styles.avatarImage, { borderColor: colors.card }]} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.card }]}>
          <Text style={[styles.avatarText, { color: colors.textInverse }]}>{userInfo?.name?.charAt(0) || "U"}</Text>
        </View>
      )}
      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>
          {userInfo?.name || "User"}
        </Text>
        <View style={[
          styles.statusDot,
          { backgroundColor: userActive ? '#22C55E' : '#94A3B8' }
        ]} />
      </View>
      <Text style={[styles.skill, { color: colors.textTertiary }]}>
        {userInfo?.bio || "No description provided"}
      </Text>
      <View style={[styles.ratingContainer, { backgroundColor: colors.inputBackground }]}>
        <Text style={[styles.ratingText, { color: colors.warning }]}>⭐ {userInfo?.rating || 0}</Text>
        <Text style={[styles.jobsText, { color: colors.textTertiary }]}>• {userInfo?.jobsCompleted || 0} jobs completed</Text>
      </View>
      {isOwnProfile && (
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => navigation.navigate("EditProfile", { userInfo })}
          activeOpacity={0.8}
        >
          <Text style={[styles.editButtonText, { color: colors.textInverse }]}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Section Header for services
  const SectionHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Services</Text>
      <View style={[styles.sectionBadge, { backgroundColor: colors.inputBackground }]}>
        <Text style={[styles.sectionBadgeText, { color: colors.textSecondary }]}>{userPosts.length}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

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
              <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No services yet</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 12,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 32,
    marginHorizontal: 20,
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: { fontSize: 32, fontWeight: "bold" },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 4,
  },
  name: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3, marginBottom: 4 },
  skill: { fontSize: 14, marginTop: 4, textAlign: "center", paddingHorizontal: 20 },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 40,
    gap: 6,
  },
  ratingText: { fontSize: 14, fontWeight: "600" },
  jobsText: { fontSize: 14 },
  editButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  editButtonText: { fontWeight: "700", fontSize: 15 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  sectionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sectionBadgeText: { fontSize: 13, fontWeight: "600" },
  // ===== POST STYLES =====
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: "100%",
  },
  card: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  description: { fontSize: 15, lineHeight: 22, flex: 1 },
  postActions: { flexDirection: "row", gap: 12, marginLeft: 10 },
  actionIcon: { padding: 4 },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 8,
    resizeMode: "cover",
  },
  mediaVideo: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: "500" },
  // ===== ACTION ROW =====
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 40,
    gap: 4,
  },
  actionButtonText: { fontWeight: "600", fontSize: 14 },
  // ===== BOOK BUTTON =====
  bookButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  bookButtonText: { fontWeight: "600", fontSize: 13, letterSpacing: 0.2 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
});