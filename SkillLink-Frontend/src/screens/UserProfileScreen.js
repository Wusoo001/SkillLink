import { useNavigation, useRoute } from "@react-navigation/native";
import { useContext, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { Video } from "expo-av"; // ✅ added for video playback

import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { getPosts, api } from "../services/api";

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { user, loading: authLoading } = useContext(AuthContext);
  const { userId: routeUserId } = route.params || {};
  const resolvedUserId = routeUserId || user?._id;

  const [userPosts, setUserPosts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Ownership check
  const isOwnProfile = user?._id === resolvedUserId;

  // ==============================
  // FETCH USER DATA
  // ==============================
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
      }
    } catch (error) {
      console.log("User profile load error:", error);
      setUserInfo(null);
      setUserPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // INITIAL LOAD
  // ==============================
  useEffect(() => {
    if (resolvedUserId) {
      loadUserData(resolvedUserId);
    }
  }, [resolvedUserId]);

  // ==============================
  // REFRESH ON FOCUS
  // ==============================
  useFocusEffect(
    useCallback(() => {
      if (!resolvedUserId) return;
      loadUserData(resolvedUserId);
    }, [resolvedUserId])
  );

  // ==============================
  // LOADING STATE
  // ==============================
  if (loading || authLoading || !resolvedUserId) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ==============================
  // RENDER POST (with media)
  // ==============================
  const renderPost = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.description}>{item.description}</Text>

      {/* ✅ Image preview */}
      {item.media && item.mediaType === "image" && (
        <Image
          source={{ uri: item.media }}
          style={styles.mediaImage}
        />
      )}

      {/* ✅ Video preview using expo-av */}
      {item.media && item.mediaType === "video" && (
        <Video
          source={{ uri: item.media }}
          style={styles.mediaVideo}
          useNativeControls
          resizeMode="cover"
        />
      )}

      <View style={styles.tagContainer}>
        {item.tags?.map((tag, index) => (
          <Text key={index} style={styles.tag}>
            #{tag}
          </Text>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* PROFILE HEADER */}
      <View style={styles.header}>
        {userInfo?.profileImage ? (
          <Image
            source={{ uri: userInfo.profileImage }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userInfo?.name?.charAt(0) || "U"}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{userInfo?.name || "User"}</Text>
        <Text style={styles.skill}>
          {userInfo?.bio || "No description provided"}
        </Text>
        <Text style={styles.rating}>
          ⭐ {userInfo?.rating || 0} • {userInfo?.jobsCompleted || 0} jobs completed
        </Text>

        {/* ✅ CONDITIONAL BUTTON */}
        {isOwnProfile ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("EditProfile", {
                userInfo,
              })
            }
          >
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("BookingScreen", {
                providerId: resolvedUserId,
              })
            }
          >
            <Text style={styles.editText}>Book</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SERVICES / POSTS */}
      <Text style={styles.sectionTitle}>Services</Text>

      <FlatList
        data={userPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No services available
          </Text>
        }
      />
    </View>
  );
}

// ==============================
// STYLES (added mediaImage and mediaVideo)
// ==============================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F5F6FA" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  avatarText: { color: "#FFF", fontSize: 26, fontWeight: "bold" },
  name: { fontSize: 20, fontWeight: "700" },
  skill: { color: "#6B7280", marginTop: 6, textAlign: "center" },
  rating: { marginTop: 6, color: "#F59E0B" },
  editButton: {
    marginTop: 12,
    backgroundColor: "#0A66FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editText: { color: "#FFF", fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
  },
  description: { fontSize: 14, color: "#374151" },
  // ✅ new styles for media
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    resizeMode: "cover",
  },
  mediaVideo: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  tag: {
    backgroundColor: "#EEF2FF",
    color: "#4F46E5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    marginRight: 6,
    marginBottom: 6,
  },
});