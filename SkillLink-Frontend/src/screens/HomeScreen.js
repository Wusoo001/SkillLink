import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Button,
} from "react-native";

import { AuthContext } from "../../context/AuthContext";
import { getPosts, searchPosts, savePost } from "../services/api";

export default function HomeScreen({ navigation }) {
  const { logout, userToken } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [savedPosts, setSavedPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Load posts
  const loadPosts = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const response = await getPosts(pageNumber);

      if (response.success) {
        const rankedPosts = response.posts.sort(
          (a, b) => (b.rating || 0) * (b.jobs || 0) - (a.rating || 0) * (a.jobs || 0)
        );

        if (pageNumber === 1) {
          setPosts(rankedPosts);
        } else {
          setPosts((prev) => [...prev, ...rankedPosts]);
        }
      }
    } catch (error) {
      console.log("Load posts error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll
  const loadMorePosts = () => {
    if (!loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  };

  // Search
  const handleSearch = async (text) => {
    setSearch(text);
    if (!text) {
      loadPosts(1);
      return;
    }
    try {
      const results = await searchPosts(text);
      setPosts(results);
    } catch (error) {
      console.log("Search error:", error);
    }
  };

  // Save post
  const toggleSave = async (id) => {
    try {
      await savePost(id, userToken);
      if (savedPosts.includes(id)) {
        setSavedPosts(savedPosts.filter((postId) => postId !== id));
      } else {
        setSavedPosts([...savedPosts, id]);
      }
    } catch (error) {
      console.log("Save error:", error);
    }
  };

  // Refresh callback from CreatePostScreen
  const handleRefresh = () => {
    setPage(1);
    loadPosts(1);
  };

  // Load posts on focus
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      loadPosts(1);
    }, [])
  );

  // Render post card
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.skill}>{item.skill}</Text>
          <Text style={styles.rating}>
            ⭐ {item.rating || 0} • {item.jobs || 0} jobs completed
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
        <TouchableOpacity onPress={() => toggleSave(item._id)}>
          <Text style={styles.secondaryAction}>
            {savedPosts.includes(item._id) ? "💙 Saved" : "🤍 Save"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate("UsersProfile", { userId: item.user })}
        >
          <Text style={styles.bookText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>SkillLink</Text>
        <Button title="Logout" onPress={logout} />
      </View>

      <TextInput
        placeholder="Search skills..."
        value={search}
        onChangeText={handleSearch}
        style={styles.searchInput}
      />

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, textAlign: "center" }}>No results found</Text>
        }
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("CreatePostScreen", { onRefresh: handleRefresh })}
      >
        <Text style={styles.floatingText}>+ Post</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F5F6FA" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold" },
  searchInput: { backgroundColor: "#FFF", padding: 12, borderRadius: 12, marginBottom: 15 },
  card: { backgroundColor: "#FFF", padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#D1D5DB", marginRight: 12 },
  name: { fontWeight: "700", fontSize: 15 },
  skill: { color: "#6B7280", fontSize: 13 },
  rating: { fontSize: 12, color: "#F59E0B", marginTop: 2 },
  description: { marginTop: 6, fontSize: 14, color: "#374151" },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  tag: { backgroundColor: "#EEF2FF", color: "#4F46E5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12, marginRight: 6, marginBottom: 6 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  secondaryAction: { fontWeight: "600", color: "#6B7280" },
  bookButton: { backgroundColor: "#0A66FF", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  bookText: { color: "#FFF", fontWeight: "600" },
  floatingButton: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#0A66FF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
  },
  floatingText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});