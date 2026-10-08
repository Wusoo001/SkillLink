import { useNavigation, useFocusEffect } from "@react-navigation/native";
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
  Modal,
  RefreshControl,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import {
  api,
  getPosts,
  searchPosts,
  savePost,
  likePost,
  unlikePost,
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/api";
import { PostContext } from "../../context/PostContext";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { isUserActive } from "../utils/helpers";

// ===== VIDEO ITEM COMPONENT (replaces expo-av Video) =====
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

// ===== NOTIFICATION ITEM COMPONENT =====
const NotificationItem = ({ notification, onPress, colors }) => {
  const getIcon = (type) => {
    switch (type) {
      case "booking_request": return "calendar-outline";
      case "booking_accepted": return "checkmark-circle-outline";
      case "booking_rejected": return "close-circle-outline";
      case "booking_cancelled": return "ban-outline";
      case "payment_received": return "cash-outline";
      case "funds_released": return "wallet-outline";
      case "chat_message": return "chatbubble-ellipses-outline";
      default: return "notifications-outline";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "booking_request": return colors.primary;
      case "booking_accepted": return colors.success;
      case "booking_rejected": return colors.danger;
      case "booking_cancelled": return colors.warning;
      case "payment_received": return colors.success;
      case "funds_released": return colors.primary;
      case "chat_message": return colors.primary;
      default: return colors.textTertiary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.read ? colors.card : colors.primaryLight + "30",
          borderColor: colors.inputBorder,
        },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIconContainer}>
        <Ionicons
          name={getIcon(notification.type)}
          size={22}
          color={getIconColor(notification.type)}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text
          style={[styles.notificationTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text
          style={[styles.notificationMessage, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
        <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
          {new Date(notification.createdAt).toLocaleDateString()}{" "}
          {new Date(notification.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { logout, userToken } = useContext(AuthContext);
  const { refreshFlag, newPost, clearNewPost } = useContext(PostContext);
  const { colors, toggleTheme, theme } = useTheme();

  // ===== POSTS STATE =====
  const [hasMore, setHasMore] = useState(true);
  const [allPosts, setAllPosts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ===== SEARCH STATE =====
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // ===== LIKE / SAVE =====
  const [savedPosts, setSavedPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);

  // ===== NOTIFICATION STATE =====
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationHasMore, setNotificationHasMore] = useState(false);

  // ===== CATEGORIES =====
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

  // ===== REFS =====
  const categoryListRef = useRef(null);
  const scaleAnim = useRef(categories.map(() => new Animated.Value(1))).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const searchTimeout = useRef(null);

  // ===== NAV HELPERS =====
  const goToUserProfile = (userId) => {
    if (!userId) return;
    navigation.navigate("UsersProfile", { userId });
  };

  const goToAllReviews = (userId, providerName) => {
    if (!userId) return;
    navigation.navigate("ReviewsScreen", { userId, providerName });
  };

  const mergeUniquePosts = (prev, incoming) => {
    const map = new Map();
    [...prev, ...incoming].forEach((post) => {
      if (post?._id) map.set(post._id, post);
    });
    return Array.from(map.values());
  };

  // ===== NOTIFICATIONS =====
  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadNotificationCount();
      if (res?.success) {
        setUnreadCount(res.count || 0);
      }
    } catch (error) {
      console.log("Unread count error:", error);
    }
  };

  const fetchNotifications = async (pageNum = 1, append = false) => {
    setNotificationsLoading(true);
    try {
      const res = await getNotifications(pageNum, 20);
      if (res.success) {
        if (append) {
          setNotifications((prev) => [...prev, ...res.data]);
        } else {
          setNotifications(res.data);
        }
        setNotificationHasMore(res.pagination?.pages > pageNum);
        setNotificationPage(pageNum);
      }
    } catch (error) {
      console.log("Fetch notifications error:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(notification._id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );
    }

    if (notification.type === "chat_message" && notification.data?.bookingId) {
      setNotificationModalVisible(false);
      navigation.navigate("Chat", {
        bookingId: notification.data.bookingId,
        otherPartyName: notification.title.replace("New message from ", ""),
        otherPartyImage: null,
      });
      return;
    }
    
    if (notification.data?.bookingId) {
      setNotificationModalVisible(false);
      navigation.navigate("BookingScreen", {
        bookingId: notification.data.bookingId,
        mode: "existing",
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.log("Mark all error:", error);
    }
  };

  const openNotificationModal = () => {
    setNotificationModalVisible(true);
    fetchNotifications(1, false);
    fetchUnreadCount();
  };

  const loadMoreNotifications = () => {
    if (!notificationsLoading && notificationHasMore) {
      fetchNotifications(notificationPage + 1, true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();

      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }, [])
  );

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
    if (!query.trim() && !location.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    setIsSearching(true);
    try {
      let url = `/posts/search?q=${encodeURIComponent(query)}`;
      if (location.trim()) url += `&city=${encodeURIComponent(location.trim())}`;
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
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => performSearch(text, locationFilter), 300);
  };

  const handleLocationFilter = (text) => {
    setLocationFilter(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => performSearch(searchQuery, text), 300);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSearchLoading(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  };

  const clearLocationFilter = () => {
    setLocationFilter("");
    if (searchQuery.trim()) performSearch(searchQuery, "");
    else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // ===== LIKE / SAVE =====
  const toggleSave = async (id) => {
    try {
      await savePost(id, userToken);
      if (savedPosts.includes(id)) setSavedPosts(savedPosts.filter((p) => p !== id));
      else setSavedPosts([...savedPosts, id]);
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
      if (isLiked) await unlikePost(postId);
      else await likePost(postId);
    } catch (error) {
      console.log("Like API error:", error);
    }
  };

  // ===== REFRESH / CATEGORIES =====
  const refreshPosts = () => {
    setPage(1);
    loadPosts(1, 20);
    fetchUnreadCount();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPosts(1, 20),
        fetchUnreadCount(),
      ]);
      setPage(1);
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCategoryPress = (category, index) => {
    setSelectedCategory(category);
    Animated.sequence([
      Animated.timing(scaleAnim[index], { toValue: 1.06, duration: 140, useNativeDriver: true }),
      Animated.timing(scaleAnim[index], { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    if (categoryListRef.current) {
      categoryListRef.current.scrollToIndex({ animated: true, index, viewPosition: 0.5 });
    }
    if (category === "All") setPosts(allPosts);
    else {
      const filtered = allPosts.filter((post) =>
        post.tags?.some((tag) => tag.toLowerCase().includes(category.toLowerCase()))
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
    const translateY = new Animated.Value(24);
    const opacity = new Animated.Value(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: Math.min(index * 40, 240),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 40, 240),
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
    const isSaved = savedPosts.includes(item._id);
    const rating = Number(item.user?.rating || 0).toFixed(1);
    const userActive = isUserActive(item.user?.lastActive);

    return (
      <Animated.View style={[styles.cardWrapper, animStyle]}>
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
          {/* ===== HEADER ROW ===== */}
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onPress={() => goToUserProfile(item.user?._id)}
              activeOpacity={0.85}
              style={styles.avatarWrap}
            >
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: colors.primary, borderColor: colors.card },
                ]}
              >
                {item.user?.profileImage ? (
                  <Image
                    source={{ uri: item.user.profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                    {item.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: userActive ? "#22C55E" : "#94A3B8",
                    borderColor: colors.card,
                  },
                ]}
              />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text
                style={[styles.name, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.user?.name || "User"}
              </Text>

              <View style={styles.skillRow}>
                <Text
                  style={[styles.skill, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.skill || "Skilled Worker"}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color={colors.primary}
                  style={styles.verifiedIcon}
                />
              </View>

              {item.location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                  <Text
                    style={[styles.locationText, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {item.location}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.ratingPill, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingPillText}>{rating}</Text>
            </View>
          </View>

          {/* ===== DESCRIPTION ===== */}
          {item.description ? (
            <Text
              style={[styles.description, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          {/* ===== MEDIA ===== */}
          {item.media && item.mediaType === "image" && (
            <Image
              source={{ uri: item.media }}
              style={styles.media}
              resizeMode="cover"
            />
          )}
          {item.media && item.mediaType === "video" && (
            <VideoItem uri={item.media} style={styles.media} />
          )}

          {/* ===== HASHTAGS ===== */}
          {item.tags?.length > 0 && (
            <View style={styles.tagRow}>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text
                  style={[styles.tagText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  #{item.tags.slice(0, 2).join(" and ")}
                </Text>
              </View>
            </View>
          )}

          {/* ===== DIVIDER ===== */}
          <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

          {/* ===== ACTION ROW ===== */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleLike(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? "#EF4444" : colors.textSecondary}
              />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => goToAllReviews(item.user?._id, item.user?.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbubble-outline"
                size={19}
                color={colors.textSecondary}
              />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {item.reviewCount || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionRight]}
              onPress={() => toggleSave(item._id)}
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

          {/* ===== BOOK CTA ===== */}
          <TouchableOpacity
            style={[
              styles.bookButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
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
            activeOpacity={0.9}
          >
            <Text style={styles.bookButtonText}>Book This Service</Text>
            <View style={styles.bookPricePill}>
              <Text style={styles.bookPriceText}>
                ₦{item.price?.toLocaleString?.() ?? item.price}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ===== SKELETON =====
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
        >
          <View style={styles.skeletonHeader}>
            <View
              style={[styles.skeletonAvatar, { backgroundColor: colors.inputBackground }]}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View
                style={[styles.skeletonText, { backgroundColor: colors.inputBackground }]}
              />
              <View
                style={[
                  styles.skeletonTextShort,
                  { backgroundColor: colors.inputBackground },
                ]}
              />
            </View>
          </View>
          <View
            style={[styles.skeletonBodyLine, { backgroundColor: colors.inputBackground }]}
          />
          <View
            style={[
              styles.skeletonBodyLineShort,
              { backgroundColor: colors.inputBackground },
            ]}
          />
          <View
            style={[styles.skeletonMedia, { backgroundColor: colors.inputBackground }]}
          />
        </View>
      ))}
    </View>
  );

  // ===== FAB ANIMATION =====
  const handleFabPressIn = () =>
    Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }).start();
  const handleFabPressOut = () =>
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }).start();

  const displayData = isSearching ? searchResults : posts;
  const isListLoading =
    (isSearching && searchLoading) ||
    (!isSearching && loading && posts.length === 0);
  const isEmpty = displayData.length === 0 && !isListLoading;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ===== HEADER ===== */}
        <View style={styles.topRow}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Street</Text>
              <Ionicons
                name="flash"
                size={18}
                color={colors.primary}
                style={styles.brandSpark}
              />
            </View>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              Find trusted professionals near you
            </Text>
          </View>

          <View style={styles.topButtons}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.card, borderColor: colors.inputBorder },
              ]}
              onPress={openNotificationModal}
              activeOpacity={0.7}
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color={colors.textPrimary}
              />
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.bellBadge,
                    { backgroundColor: colors.danger, borderColor: colors.card },
                  ]}
                >
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.card, borderColor: colors.inputBorder },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons
                name={theme === "light" ? "moon-outline" : "sunny-outline"}
                size={19}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== SEARCH AREA ===== */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={19}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search skills, professionals..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.cityBar,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <Ionicons
              name="location-outline"
              size={15}
              color={colors.primary}
              style={styles.cityIcon}
            />
            <TextInput
              style={[styles.cityInput, { color: colors.textPrimary }]}
              placeholder="Filter by city"
              placeholderTextColor={colors.textTertiary}
              value={locationFilter}
              onChangeText={handleLocationFilter}
              returnKeyType="search"
            />
            {locationFilter.length > 0 ? (
              <TouchableOpacity onPress={clearLocationFilter} style={styles.clearCity}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            )}
          </View>
        </View>

        {/* ===== CATEGORIES ===== */}
        {!isSearching && (
          <View style={styles.categorySection}>
            <FlatList
              ref={categoryListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item, index }) => (
                <Animated.View style={{ transform: [{ scale: scaleAnim[index] }] }}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.inputBorder,
                      },
                      selectedCategory === item && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleCategoryPress(item, index)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            selectedCategory === item
                              ? colors.textInverse
                              : colors.textSecondary,
                        },
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

        {/* ===== LIST ===== */}
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
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              isEmpty ? (
                <View style={styles.emptyContainer}>
                  <View
                    style={[
                      styles.emptyIconWrap,
                      { backgroundColor: colors.inputBackground },
                    ]}
                  >
                    <Ionicons
                      name={isSearching ? "search-outline" : "cube-outline"}
                      size={28}
                      color={colors.textTertiary}
                    />
                  </View>
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
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.footerLoader}
                />
              ) : null
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* ===== FAB ===== */}
        <Animated.View
          style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={[
              styles.floatingButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={() => navigation.navigate("CreatePostScreen")}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={1}
          >
            <Ionicons name="add" size={26} color={colors.textInverse} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ===== NOTIFICATION MODAL ===== */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationModalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.notificationModalHeader, { borderBottomColor: colors.inputBorder }]}>
              <Text style={[styles.notificationModalTitle, { color: colors.textPrimary }]}>
                Notifications
              </Text>
              <View style={styles.notificationModalActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                    <Text style={[styles.markAllReadText, { color: colors.primary }]}>
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setNotificationModalVisible(false)}
                  style={{ marginLeft: 14 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {notifications.length === 0 && !notificationsLoading ? (
              <View style={styles.emptyNotifications}>
                <Ionicons
                  name="notifications-off-outline"
                  size={44}
                  color={colors.textTertiary}
                />
                <Text style={[styles.emptyNotificationsText, { color: colors.textTertiary }]}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <NotificationItem
                    notification={item}
                    onPress={handleNotificationPress}
                    colors={colors}
                  />
                )}
                contentContainerStyle={styles.notificationList}
                onEndReached={loadMoreNotifications}
                onEndReachedThreshold={0.2}
                ListFooterComponent={
                  notificationsLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.notificationLoader}
                    />
                  ) : null
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ========================================
// STYLES (unchanged)
// ========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 30 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  brandBlock: { flex: 1, paddingRight: 8 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  brandSpark: { marginLeft: -2, marginTop: 2 },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.1,
  },
  topButtons: { flexDirection: "row", gap: 8, paddingTop: 4 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: "#FFFFFF", fontSize: 9.5, fontWeight: "800" },

  searchSection: { marginBottom: 14, gap: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14.5, fontWeight: "500", paddingVertical: 0 },
  clearButton: { padding: 2 },

  cityBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    alignSelf: "flex-start",
    minWidth: 180,
  },
  cityIcon: { marginRight: 6 },
  cityInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 0,
    marginRight: 6,
  },
  clearCity: { padding: 2 },

  categorySection: { marginBottom: 14 },
  categoryList: { paddingHorizontal: 2, gap: 8 },
  categoryChip: {
    height: 38,
    paddingHorizontal: 20,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: { fontWeight: "600", fontSize: 13.5 },

  cardWrapper: { marginBottom: 14 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarWrap: { position: "relative", marginRight: 12 },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  avatarText: { fontWeight: "700", fontSize: 19 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
  },
  headerInfo: { flex: 1, paddingRight: 8 },
  name: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  skillRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  skill: {
    fontSize: 13,
    fontWeight: "600",
    maxWidth: "85%",
    marginRight: 4,
  },
  verifiedIcon: {},
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText: { fontSize: 11.5, fontWeight: "500" },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  ratingPillText: { fontSize: 12.5, fontWeight: "700", color: "#92400E" },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    marginBottom: 12,
  },
  media: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontSize: 12, fontWeight: "600" },
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
    height: 52,
    paddingHorizontal: 18,
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
    fontSize: 15,
    letterSpacing: 0.1,
  },
  bookPricePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  bookPriceText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13.5,
  },
  fabWrap: {
    position: "absolute",
    bottom: 24,
    right: 20,
  },
  floatingButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  skeletonContainer: { flex: 1, gap: 14, paddingTop: 4 },
  skeletonCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  skeletonHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  skeletonAvatar: { width: 50, height: 50, borderRadius: 25 },
  skeletonText: { height: 13, borderRadius: 6, marginBottom: 8, width: "60%" },
  skeletonTextShort: { height: 11, borderRadius: 6, width: "35%" },
  skeletonBodyLine: { height: 12, borderRadius: 6, marginBottom: 8, width: "92%" },
  skeletonBodyLineShort: { height: 12, borderRadius: 6, marginBottom: 14, width: "58%" },
  skeletonMedia: { height: 200, borderRadius: 14 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
  footerLoader: { marginVertical: 20 },
  listContent: { paddingBottom: 100, paddingTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationModalContainer: {
    borderRadius: 24,
    padding: 18,
    width: "92%",
    maxHeight: "80%",
  },
  notificationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  notificationModalTitle: { fontSize: 19, fontWeight: "700" },
  notificationModalActions: { flexDirection: "row", alignItems: "center" },
  markAllReadText: { fontSize: 13, fontWeight: "600" },
  notificationList: { gap: 8, paddingBottom: 8 },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  notificationIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    marginRight: 10,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14.5, fontWeight: "600", marginBottom: 2 },
  notificationMessage: { fontSize: 13, marginBottom: 2, lineHeight: 18 },
  notificationTime: { fontSize: 11.5 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  emptyNotifications: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyNotificationsText: { fontSize: 15, marginTop: 10 },
  notificationLoader: { paddingVertical: 14 },
});