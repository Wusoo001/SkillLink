
import { useNavigation } from "@react-navigation/native";
import { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Button,
  Animated,
} from "react-native";

import { AuthContext } from "../../context/AuthContext";
import { getPosts, searchPosts, savePost } from "../services/api";
import { PostContext } from "../../context/PostContext";
import { Image } from "react-native";
import { Video } from "expo-av";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { logout, userToken } = useContext(AuthContext);
  const { refreshFlag, newPost, clearNewPost } = useContext(PostContext);
  const [hasMore, setHasMore] = useState(true);

  const [allPosts, setAllPosts] = useState([]);
  const [posts, setPosts] = useState([]);

  const [search, setSearch] = useState("");
  const [savedPosts, setSavedPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = [
    "All",
    "Electrician",
    "Plumber",
    "Mechanic",
    "Cleaner",
    "Designer",
    "Developer",
    "Carpenter",
  ];

  const categoryListRef = useRef(null);
  const scaleAnim = useRef(
    categories.map(() => new Animated.Value(1))
  ).current;

  // ✅ Navigation handler
  const goToUserProfile = (userId) => {
    if (!userId) return;
    navigation.navigate("UsersProfile", { userId });
  };

  // ✅ Deduplication helper
  const mergeUniquePosts = (prev, incoming) => {
    const map = new Map();
    [...prev, ...incoming].forEach((post) => {
      if (post?._id) {
        map.set(post._id, post);
      }
    });
    return Array.from(map.values());
  };

  const loadPosts = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const response = await getPosts(pageNumber);

      if (response.success) {
        setHasMore(response.hasMore);
        const rankedPosts = response.posts.sort(
          (a, b) =>
            (b.user?.rating || 0) * (b.user?.jobsCompleted || 0) -
            (a.user?.rating || 0) * (a.user?.jobsCompleted || 0)
        );

        if (pageNumber === 1) {
          setAllPosts(rankedPosts);
          setPosts(rankedPosts);
        } else {
          setAllPosts((prev) => mergeUniquePosts(prev, rankedPosts));
          setPosts((prev) => mergeUniquePosts(prev, rankedPosts));
        }
      }
    } catch (error) {
      console.log("Load posts error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = () => {
  if (loading || !hasMore) return;

  const nextPage = page + 1;
  setPage(nextPage);

  console.log("Loading page:", nextPage); // DEBUG

  loadPosts(nextPage);
};

  const handleSearch = async (text) => {
    setSearch(text);

    if (!text) {
      setPosts(allPosts);
      return;
    }

    try {
      const results = await searchPosts(text);
      setPosts(results);
    } catch (error) {
      console.log("Search error:", error);
    }
  };

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

  const refreshPosts = () => {
    setPage(1);
    loadPosts(1);
  };

  const handleCategoryPress = (category, index) => {
    setSelectedCategory(category);

    Animated.sequence([
      Animated.timing(scaleAnim[index], {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (categoryListRef.current) {
      categoryListRef.current.scrollToIndex({
        animated: true,
        index,
        viewPosition: 0.5,
      });
    }

    if (category === "All") {
      setPosts(allPosts);
    } else {
      const filtered = allPosts.filter((post) =>
        post.tags?.some((tag) =>
          tag.toLowerCase().includes(category.toLowerCase())
        )
      );
      setPosts(filtered);
    }
  };

  // ✅ Reset state when user changes (CRITICAL FIX)
  useEffect(() => {
    setAllPosts([]);
    setPosts([]);
    setPage(1);
    refreshPosts();
  }, [userToken]);

  useEffect(() => {
    if (newPost) {
      setAllPosts((prev) => [newPost, ...prev]);
      setPosts((prev) => [newPost, ...prev]);
      clearNewPost();
    }
    refreshPosts();
  }, [refreshFlag]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goToUserProfile(item.user?._id)}>
          <View style={styles.avatarContainer}>
            {item.user?.profileImage ? (
              <Image
                source={{ uri: item.user.profileImage }}
                style={{ width: 50, height: 50, borderRadius: 25 }}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.user?.name?.charAt(0) || "U"}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.user?.name || "User"}</Text>
          <Text style={styles.skill}>
            {item.user?.skill || "Skilled Worker"}
          </Text>
          <Text style={styles.rating}>
            ⭐ {item.user?.rating || 0} • {item.user?.jobsCompleted || 0} jobs
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{item.description}</Text>
      {item.media && item.mediaType === "image" && (
      <Image
         source={{ uri: item.media }}
         style={{ width: "100%", height: 200, borderRadius: 10, marginTop: 10 }}
      />
      )}

      {item.media && item.mediaType === "video" && (
      <Video
        source={{ uri: item.media }}
        style={{ width: "100%", height: 200, borderRadius: 10, marginTop: 10 }}
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

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => toggleSave(item._id)}>
          <Text style={styles.secondaryAction}>
            {savedPosts.includes(item._id) ? "💙 Saved" : "🤍 Save"}
          </Text>
        </TouchableOpacity>

        <View />
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

      <View style={{ width: "100%", marginBottom: 15 }}>
        <FlatList
          ref={categoryListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingLeft: 10, paddingRight: 20 }}
          getItemLayout={(data, index) => ({
            length: 96,
            offset: 96 * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <Animated.View style={{ transform: [{ scale: scaleAnim[index] }] }}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.activeCategory,
                ]}
                onPress={() => handleCategoryPress(item, index)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === item &&
                      styles.activeCategoryText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, textAlign: "center" }}>
            No results found
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("CreatePostScreen")}
      >
        <Text style={styles.floatingText}>+ Post</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F5F6FA" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 22, fontWeight: "bold" },
  searchInput: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  categoryChip: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCategory: { backgroundColor: "#0A66FF" },
  categoryText: { fontWeight: "600", color: "#374151", textAlign: "center" },
  activeCategoryText: { color: "#FFF" },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  name: { fontWeight: "700", fontSize: 15 },
  skill: { color: "#6B7280", fontSize: 13 },
  rating: { fontSize: 12, color: "#F59E0B", marginTop: 2 },
  description: { marginTop: 6, fontSize: 14, color: "#374151" },
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  secondaryAction: { fontWeight: "600", color: "#6B7280" },
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

