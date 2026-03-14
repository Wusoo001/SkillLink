import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import api from "../services/api";

export default function UserProfileScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);

  const routeUserId = route?.params?.userId;
  const profileId = routeUserId || user?._id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [profileId]);

  const fetchUserData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const profileRes = await api.get(`/users/${profileId}`);
      const postRes = await api.get(`/posts/user/${profileId}`);

      setProfile(profileRes.data);

      const userPosts = Array.isArray(postRes.data)
        ? postRes.data
        : postRes.data.posts || [];

      setPosts(userPosts);
    } catch (error) {
      console.log("Fetch profile error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0A66FF" />
      </View>
    );
  }

  const isOwner = profile?._id === user?._id;

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postDescription}>{item.description}</Text>
      <Text style={styles.postMeta}>Budget: ₦{item.budget || "N/A"}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* PROFILE HEADER */}
      <View style={styles.profileCard}>
        <Image
          source={{
            uri:
              profile?.avatar ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />

        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>

        {/* USER STATS */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile?.jobsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile?.rating || 0}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {profile?.responseTime || "1h"}
            </Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
        </View>

        {/* ACTION BUTTON */}
        <View style={styles.buttonRow}>
          {isOwner ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text style={styles.btnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() =>
                navigation.navigate("BookingScreen", { providerId: profile._id })
              }
            >
              <Text style={styles.btnText}>Book Service</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SKILLS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Skills</Text>
        {profile?.skills?.length ? (
          <View style={styles.skillsList}>
            {profile.skills.map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No skills added</Text>
        )}
      </View>

      {/* PORTFOLIO */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Portfolio</Text>
        {profile?.portfolio?.length ? (
          profile.portfolio.map((item, index) => (
            <View key={index} style={styles.portfolioItem}>
              <Text style={styles.portfolioTitle}>{item.title}</Text>
              <Text>{item.description}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No portfolio uploaded</Text>
        )}
      </View>

      {/* SERVICES / POSTS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services</Text>

        {posts.length === 0 ? (
          <Text style={styles.empty}>No services posted</Text>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item._id}
            renderItem={renderPost}
            scrollEnabled={false} // main ScrollView handles scrolling
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  profileCard: {
    alignItems: "center",
    padding: 25,
    backgroundColor: "white",
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  name: { fontSize: 22, fontWeight: "bold" },
  email: { color: "gray" },

  statsRow: { flexDirection: "row", marginTop: 15 },
  stat: { alignItems: "center", marginHorizontal: 20 },
  statNumber: { fontWeight: "bold", fontSize: 16 },
  statLabel: { color: "gray", fontSize: 12 },

  buttonRow: { flexDirection: "row", marginTop: 15 },
  editBtn: { backgroundColor: "#4CAF50", padding: 10, borderRadius: 6 },
  bookBtn: { backgroundColor: "#3B6EF6", padding: 10, borderRadius: 6 },
  btnText: { color: "white", fontWeight: "bold" },

  card: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 1,
  },

  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

  skillsList: { flexDirection: "row", flexWrap: "wrap" },
  skillBadge: {
    backgroundColor: "#EAF2FF",
    padding: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: { color: "#3B6EF6", fontWeight: "600" },

  portfolioItem: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  portfolioTitle: { fontWeight: "bold" },

  postCard: {
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  postTitle: { fontWeight: "bold", fontSize: 16 },
  postDescription: { color: "#555" },
  postMeta: { fontSize: 12, color: "#777" },

  empty: { color: "gray", fontStyle: "italic" },
});