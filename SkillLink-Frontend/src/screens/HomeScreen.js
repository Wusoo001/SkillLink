import { useNavigation } from "@react-navigation/native";
import { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  SafeAreaView,
  ActivityIndicator,
  Image as RNImage,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { getPosts, searchPosts, savePost } from "../services/api";
import { PostContext } from "../../context/PostContext";
import { Image } from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { logout, userToken } = useContext(AuthContext);
  const { refreshFlag, newPost, clearNewPost } = useContext(PostContext);
  const { colors, toggleTheme, theme } = useTheme();

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
  const fabScale = useRef(new Animated.Value(1)).current;

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
    console.log("Loading page:", nextPage);
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

  // Card entry animation (fade + slide)
  const getCardAnimation = (index) => {
    const translateY = new Animated.Value(50);
    const opacity = new Animated.Value(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
    return { transform: [{ translateY }], opacity };
  };

  const renderItem = ({ item, index }) => {
    const animStyle = getCardAnimation(index);
    return (
      <Animated.View style={[styles.cardWrapper, animStyle]}>
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => goToUserProfile(item.user?._id)} activeOpacity={0.7}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                {item.user?.profileImage ? (
                  <Image
                    source={{ uri: item.user.profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                    {item.user?.name?.charAt(0) || "U"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{item.user?.name || "User"}</Text>
              <Text style={[styles.skill, { color: colors.textTertiary }]}>{item.user?.skill || "Skilled Worker"}</Text>
              <View style={styles.ratingContainer}>
                <Text style={[styles.ratingText, { color: colors.warning }]}>⭐ {item.user?.rating || 0}</Text>
                <Text style={[styles.jobsText, { color: colors.textTertiary }]}>• {item.user?.jobsCompleted || 0} jobs</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
          {item.media && item.mediaType === "image" && (
            <Image
              source={{ uri: item.media }}
              style={styles.media}
            />
          )}
          {item.media && item.mediaType === "video" && (
            <Video
              source={{ uri: item.media }}
              style={styles.media}
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

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.gray }]}
              onPress={() => toggleSave(item._id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.saveButtonText, { color: colors.textPrimary }]}>
                {savedPosts.includes(item._id) ? "❤️ Saved" : "🤍 Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((_, idx) => (
        <View key={idx} style={[styles.skeletonCard, { backgroundColor: colors.card }]}>
          <View style={[styles.skeletonAvatar, { backgroundColor: colors.inputBackground }]} />
          <View style={[styles.skeletonText, { backgroundColor: colors.inputBackground }]} />
          <View style={[styles.skeletonTextShort, { backgroundColor: colors.inputBackground }]} />
          <View style={[styles.skeletonMedia, { backgroundColor: colors.inputBackground }]} />
        </View>
      ))}
    </View>
  );

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>SkillLink</Text>
          <View style={styles.topButtons}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]} onPress={refreshPosts} activeOpacity={0.7}>
              <Text style={styles.iconButtonText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.gray }]} onPress={logout} activeOpacity={0.7}>
              <Text style={[styles.logoutText, { color: colors.textPrimary }]}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]} onPress={toggleTheme} activeOpacity={0.7}>
              <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <Text style={[styles.searchIcon, { color: colors.textTertiary }]}>🔍</Text>
          <TextInput
            placeholder="Search skills, professionals..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={handleSearch}
            style={[styles.searchInput, { backgroundColor: colors.card, color: colors.textPrimary, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}
          />
        </View>

        <View style={styles.categorySection}>
          <FlatList
            ref={categoryListRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.categoryList}
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
                    { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity },
                    selectedCategory === item && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleCategoryPress(item, index)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: selectedCategory === item ? colors.textInverse : colors.textSecondary },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </View>

        {loading && posts.length === 0 ? (
          renderSkeleton()
        ) : (
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
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No results found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Try adjusting your search or category</Text>
              </View>
            }
            ListFooterComponent={
              loading && posts.length > 0 ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.footerLoader} />
              ) : null
            }
          />
        )}

        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => navigation.navigate("CreatePostScreen")}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={1}
          >
            <Text style={[styles.floatingText, { color: colors.textInverse }]}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  topButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconButtonText: {
    fontSize: 18,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 40,
  },
  logoutText: {
    fontWeight: "600",
    fontSize: 14,
  },
  searchWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    top: 14,
    zIndex: 1,
    fontSize: 16,
  },
  searchInput: {
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 20,
    borderRadius: 32,
    fontSize: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryList: {
    paddingRight: 20,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 40,
    marginRight: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  categoryText: {
    fontWeight: "600",
    fontSize: 14,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontWeight: "bold",
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 2,
  },
  skill: {
    fontSize: 13,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  jobsText: {
    fontSize: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  media: {
    width: "100%",
    height: 200,
    borderRadius: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 12,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 40,
  },
  saveButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingText: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  skeletonContainer: {
    flex: 1,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
  },
  skeletonText: {
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
    width: "80%",
  },
  skeletonTextShort: {
    height: 14,
    borderRadius: 8,
    marginBottom: 12,
    width: "50%",
  },
  skeletonMedia: {
    height: 180,
    borderRadius: 18,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  footerLoader: {
    marginVertical: 24,
  },
});