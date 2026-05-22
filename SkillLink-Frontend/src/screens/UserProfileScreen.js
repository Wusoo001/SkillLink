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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { getPosts, api } from "../services/api";

// ==============================
// PostItem Component (unchanged)
// ==============================
const PostItem = ({ item, userId }) => {
  const navigation = useNavigation();
  const bookScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(bookScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(bookScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.description}>{item.description}</Text>
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
          <View key={idx} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
      <Animated.View style={{ transform: [{ scale: bookScale }] }}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            navigation.navigate("BookingScreen", {
              providerId: userId,
              serviceTitle: item.description,
              price: item.price,
            })
          }
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Text style={styles.bookButtonText}>Book This Service</Text>
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
  const { userId: routeUserId } = route.params || {};
  const resolvedUserId = routeUserId || user?._id;

  const [userPosts, setUserPosts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const isOwnProfile = user?._id === resolvedUserId;

  const loadUserData = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setUserInfo(res.data);
      const postsRes = await getPosts(1);
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

  if (loading || authLoading || !resolvedUserId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  // Header component that will be rendered above the list
  const ProfileHeader = () => (
    <View style={styles.header}>
      {userInfo?.profileImage ? (
        <Image source={{ uri: userInfo.profileImage }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInfo?.name?.charAt(0) || "U"}</Text>
        </View>
      )}
      <Text style={styles.name}>{userInfo?.name || "User"}</Text>
      <Text style={styles.skill}>{userInfo?.bio || "No description provided"}</Text>
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingText}>⭐ {userInfo?.rating || 0}</Text>
        <Text style={styles.jobsText}>• {userInfo?.jobsCompleted || 0} jobs completed</Text>
      </View>
      {isOwnProfile && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("EditProfile", { userInfo })}
          activeOpacity={0.8}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const SectionHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Services</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{userPosts.length}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Back button - absolutely positioned */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* The FlatList takes all available space */}
        <FlatList
          key={resetKey}
          data={userPosts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <PostItem item={item} userId={resolvedUserId} />}
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
              tintColor="#2563EB"
              colors={["#2563EB"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptySubtitle}>
                {isOwnProfile
                  ? "Create your first service post"
                  : "This user hasn't posted any services"}
              </Text>
            </View>
          }
          style={{ flex: 1 }} // ensure FlatList fills container
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1, // critical: this View takes full height
  },
  backButton: {
    position: "absolute",
    top: 12,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    marginHorizontal: 20,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: "#0F172A",
    marginBottom: 4,
  },
  skill: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 40,
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
  },
  jobsText: {
    fontSize: 14,
    color: "#475569",
  },
  editButton: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 40,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  editButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    // Ensure content is at least as tall as the screen to enable scrolling
    minHeight: "100%",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
    marginBottom: 12,
  },
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
  tag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});