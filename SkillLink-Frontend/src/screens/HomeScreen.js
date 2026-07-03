import { useNavigation } from "@react-navigation/native";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
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
  Image,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { api,getPosts, searchPosts, savePost, likePost, unlikePost } from "../services/api";
import { PostContext } from "../../context/PostContext";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { isUserActive } from "../utils/helpers";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { logout, userToken } = useContext(AuthContext);
  const { refreshFlag, newPost, clearNewPost } = useContext(PostContext);
  const { colors, toggleTheme, theme } = useTheme();

  // Posts state
  const [hasMore, setHasMore] = useState(true);
  const [allPosts, setAllPosts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Like & Save state
  const [savedPosts, setSavedPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);

  // Categories
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

  // Refs
  const categoryListRef = useRef(null);
  const scaleAnim = useRef(
    categories.map(() => new Animated.Value(1))
  ).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const searchTimeout = useRef(null);

  // Navigation helpers
  const goToUserProfile = (userId) => {
    if (!userId) return;
    navigation.navigate("UsersProfile", { userId });
  };

  const goToAllReviews = (userId, providerName) => {
    if (!userId) return;
    navigation.navigate("ReviewsScreen", { userId, providerName });
  };

  // Merge posts (for pagination)
  const mergeUniquePosts = (prev, incoming) => {
    const map = new Map();
    [...prev, ...incoming].forEach((post) => {
      if (post?._id) {
        map.set(post._id, post);
      }
    });
    return Array.from(map.values());
  };

  // ===== LOAD POSTS =====
  const loadPosts = async (pageNumber = 1, limit = 20) => {
    try {
      setLoading(true);
      const response = await getPosts(pageNumber, limit);

      if (response.success) {
        setHasMore(response.hasMore);
        const rankedPosts = response.posts;
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
    loadPosts(nextPage);
  };

  // ===== SEARCH =====
  const performSearch = useCallback(async (query, location) => {
    // If no search query AND no location filter, clear search
    if (!query.trim() && !location.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setIsSearching(true);

    try {
      // Build URL with query params
      let url = `/posts/search?q=${encodeURIComponent(query)}`;
      if (location.trim()) {
        url += `&city=${encodeURIComponent(location.trim())}`;
      }

      const response = await api.get(url);
      setSearchResults(response.data);
    } catch (error) {
      console.log("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce: wait 300ms before searching
    searchTimeout.current = setTimeout(() => {
      performSearch(text, locationFilter);
    }, 300);
  };

  const handleLocationFilter = (text) => {
    setLocationFilter(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce: wait 300ms before searching
    searchTimeout.current = setTimeout(() => {
      performSearch(searchQuery, text);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSearchLoading(false);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  };

  const clearLocationFilter = () => {
    setLocationFilter("");
    // If there's a search query, re-search without location
    if (searchQuery.trim()) {
      performSearch(searchQuery, "");
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // ===== LIKE & SAVE =====
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

  const toggleLike = async (postId) => {
    const isLiked = likedPosts.includes(postId);
    setLikedPosts((prev) =>
      isLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
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
      console.log("Like API error:", error);
    }
  };

  // ===== REFRESH & CATEGORIES =====
  const refreshPosts = () => {
    setPage(1);
    loadPosts(1, 20);
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

  // ===== EFFECTS =====
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

  // ===== CARD ANIMATION =====
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

  // ===== RENDER ITEM =====
  const renderItem = ({ item, index }) => {
    const animStyle = getCardAnimation(index);
    const isLiked = likedPosts.includes(item._id);
    const likeCount = item.likesCount || 0;
    const userActive = isUserActive(item.user?.lastActive);

    return (
      <Animated.View style={[styles.cardWrapper, animStyle]}>
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}>
          {/* User Header */}
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
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>
                  {item.user?.name || "User"}
                </Text>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: userActive ? '#22C55E' : '#94A3B8' }
                ]} />
              </View>
              {/* ✅ Display skill from the POST, not from user model */}
              <Text style={[styles.skill, { color: colors.textTertiary }]}>
                {item.skill || "Skilled Worker"}
              </Text>
              {/* ✅ Show location badge if available */}
              {item.location && (
                <View style={styles.locationBadge}>
                  <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                  <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                    {item.location}
                  </Text>
                </View>
              )}
              <View style={styles.ratingContainer}>
                <Text style={[styles.ratingText, { color: colors.warning }]}>
                  ⭐ {item.user?.rating || 0}
                </Text>
                <Text style={[styles.jobsText, { color: colors.textTertiary }]}>
                  • {item.user?.jobsCompleted || 0} jobs
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>

          {/* Media */}
          {item.media && item.mediaType === "image" && (
            <Image source={{ uri: item.media }} style={styles.media} />
          )}
          {item.media && item.mediaType === "video" && (
            <Video
              source={{ uri: item.media }}
              style={styles.media}
              useNativeControls
              resizeMode="cover"
            />
          )}

          {/* Tags */}
          <View style={styles.tagContainer}>
            {item.tags?.map((tag, idx) => (
              <View key={idx} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.gray }]}
              onPress={() => toggleLike(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? colors.danger : colors.textTertiary}
              />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {likeCount > 0 ? likeCount : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.gray }]}
              onPress={() => goToAllReviews(item.user?._id, item.user?.name)}
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

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.gray }]}
              onPress={() => toggleSave(item._id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {savedPosts.includes(item._id) ? "❤️ Saved" : "🤍 Save"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: colors.primary }]}
            onPress={() =>
              navigation.navigate("BookingScreen", {
                providerId: item.user?._id,
                providerName: item.user?.name || "Provider",
                serviceTitle: item.description,
                price: item.price,
                description: item.description,
                postId: item._id,
              })
            }
          >
            <Text style={[styles.bookButtonText, { color: colors.textInverse }]}>Book This Service</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ===== SKELETON LOADER =====
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

  // ===== FAB ANIMATION =====
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

  // ===== RENDER LOGIC =====
  const displayData = isSearching ? searchResults : posts;
  const isListLoading = (isSearching && searchLoading) || (!isSearching && loading && posts.length === 0);
  const isEmpty = displayData.length === 0 && !isListLoading;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Bar */}
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Street</Text>
          <View style={styles.topButtons}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]} onPress={refreshPosts} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.gray }]} onPress={logout} activeOpacity={0.7}>
              <Text style={[styles.logoutText, { color: colors.textPrimary }]}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]} onPress={toggleTheme} activeOpacity={0.7}>
              <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar with Location Filter */}
        <View style={styles.searchContainer}>
          {/* Main Search Input */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              placeholder="Search skills, professionals..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.textPrimary, shadowColor: colors.shadowColor, shadowOpacity: colors.shadowOpacity }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Location Filter */}
          <View style={styles.locationWrapper}>
            <Ionicons name="location-outline" size={18} color={colors.textTertiary} style={styles.locationIcon} />
            <TextInput
              style={[styles.locationInput, { backgroundColor: colors.card, color: colors.textPrimary }]}
              placeholder="Filter by city..."
              placeholderTextColor={colors.textTertiary}
              value={locationFilter}
              onChangeText={handleLocationFilter}
            />
            {locationFilter.length > 0 && (
              <TouchableOpacity onPress={clearLocationFilter} style={styles.clearLocation}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories – hidden when searching */}
        {!isSearching && (
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
        )}

        {/* Posts / Search Results */}
        {isListLoading ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            onEndReached={!isSearching ? loadMorePosts : null}
            onEndReachedThreshold={0.2}
            ListEmptyComponent={
              isEmpty ? (
                <View style={styles.emptyContainer}>
                  {isSearching ? (
                    <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                  ) : (
                    <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                  )}
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {isSearching ? "No results found" : "No posts yet"}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                    {isSearching 
                      ? "Try adjusting your search terms or location filter" 
                      : "Be the first to create a service post!"}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              !isSearching && loading && posts.length > 0 ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.footerLoader} />
              ) : null
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* FAB */}
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

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  
  // Top Bar
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  topButtons: { flexDirection: "row", gap: 12 },
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
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 40,
  },
  logoutText: { fontWeight: "600", fontSize: 14 },

  // Search Container
  searchContainer: {
    marginBottom: 16,
    gap: 8,
  },
  searchWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 44,
    borderRadius: 32,
    fontSize: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  clearButton: {
    position: "absolute",
    right: 16,
    padding: 4,
  },

  // Location Filter
  locationWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 40,
    borderRadius: 24,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "transparent",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  clearLocation: {
    position: "absolute",
    right: 14,
    padding: 4,
  },

  // Categories
  categorySection: { marginBottom: 20 },
  categoryList: { paddingRight: 20, gap: 8 },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 40,
    marginRight: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  categoryText: { fontWeight: "600", fontSize: 14 },

  // Card
  cardWrapper: { marginBottom: 16 },
  card: {
    borderRadius: 24,
    padding: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
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
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontWeight: "bold", fontSize: 22 },
  headerInfo: { flex: 1 },
  name: { fontWeight: "700", fontSize: 17, marginBottom: 2 },
  skill: { fontSize: 13, marginBottom: 2 },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "400",
  },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { fontSize: 12, fontWeight: "600" },
  jobsText: { fontSize: 12 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 14 },
  media: { width: "100%", height: 200, borderRadius: 18, marginTop: 10, marginBottom: 10 },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, marginBottom: 12, gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: "500" },

  // Action Row
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

  // Book Button
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
  bookButtonText: {
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // Floating Action Button
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
  floatingText: { fontSize: 28, fontWeight: "600", lineHeight: 32 },

  // Skeletons
  skeletonContainer: { flex: 1, gap: 16 },
  skeletonCard: { borderRadius: 24, padding: 18, marginBottom: 16 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 12 },
  skeletonText: { height: 16, borderRadius: 8, marginBottom: 8, width: "80%" },
  skeletonTextShort: { height: 14, borderRadius: 8, marginBottom: 12, width: "50%" },
  skeletonMedia: { height: 180, borderRadius: 18 },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },

  // Footer Loader
  footerLoader: { marginVertical: 24 },
  listContent: { paddingBottom: 40 },
});