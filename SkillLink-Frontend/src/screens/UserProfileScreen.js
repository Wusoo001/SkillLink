import { useNavigation, useRoute } from "@react-navigation/native";
import { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { getUserProfile } from "../services/api";

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userToken, user } = useContext(AuthContext);
  const { userId } = route.params;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isCurrentUser = user && user.id === userId;

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile(userId, userToken);
      if (response.success) {
        setProfile(response.user);
        setPosts(response.posts);
      }
    } catch (error) {
      console.log("Profile fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const renderPost = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.skill}>{item.skill}</Text>
          <Text style={styles.rating}>
            ⭐ {item.rating || 0} • {item.jobsCompleted || 0} jobs completed
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.tagContainer}>
        {item.tags?.map((tag, index) => (
          <Text key={index} style={styles.tag}>
            #{tag}
          </Text>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            navigation.navigate("UsersProfile", { userId: item.user._id })
          }
        >
          <Text style={styles.bookText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0A66FF" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.skill}>{profile.skill || "No skill listed"}</Text>
        {profile.description ? (
          <Text style={styles.description}>{profile.description}</Text>
        ) : null}

        {isCurrentUser && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("EditProfileScreen", { profile })
            }
          >
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User Posts */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost} // Use inline post card UI
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, textAlign: "center" }}>
            No posts yet
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F5F6FA" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 15 },
  name: { fontSize: 22, fontWeight: "bold" },
  skill: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  description: { fontSize: 13, color: "#374151", marginTop: 4 },
  editButton: {
    marginTop: 10,
    backgroundColor: "#0A66FF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  editText: { color: "#FFF", fontWeight: "600" },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
  },
  headerCard: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#D1D5DB", marginRight: 12 },
  rating: { fontSize: 12, color: "#F59E0B", marginTop: 2 },
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
  actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  bookButton: { backgroundColor: "#0A66FF", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  bookText: { color: "#FFF", fontWeight: "600" },
});