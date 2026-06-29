import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE = "http://192.168.1.22:5000/api";

// ================================
// AXIOS INSTANCE
// ================================
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================================
// REQUEST INTERCEPTOR (Attach Token + Debug)
// ================================
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    console.log("🔑 [API] Token being sent to", config.url, ":", token ? `${token.slice(0,20)}...` : "NO TOKEN");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ================================
// RESPONSE INTERCEPTOR (Debugging)
// ================================
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.data);
    return response;
  },
  (error) => {
    console.log("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ================================
// AUTH
// ================================
export const registerUser = async (userData) => {
  try {
    const res = await api.post("/auth/register", userData);
    return { success: true, ...res.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Register failed",
    };
  }
};

export const loginUser = async (userData) => {
  try {
    const res = await api.post("/auth/login", userData);
    return {
      success: !!res.data.token,
      token: res.data.token,
      user: res.data.user,
      message: res.data.message,
    };
  } catch (error) {
    return {
      success: false,
      token: null,
      message: error.response?.data?.message || "Login failed",
    };
  }
};

// ================================
// POSTS
// ================================
export const getPosts = async (page = 1, limit = 20) => {
  try {
    const res = await api.get(`/posts?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error) {
    return [];
  }
};

export const searchPosts = async (skill) => {
  try {
    const res = await api.get(`/posts/search?skill=${skill}`);
    return res.data;
  } catch (error) {
    return [];
  }
};

export const createPost = async (postData) => {
  try {
    const res = await api.post("/posts", postData);
    return { success: true, ...res.data };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || "Create post failed" };
  }
};

export const savePost = async (postId) => {
  try {
    const res = await api.put(`/posts/save/${postId}`);
    return res.data;
  } catch (error) {
    console.log("Save post error:", error.response?.data || error.message);
    return null;
  }
};

export const getMyPosts = async () => {
  try {
    const res = await api.get("/posts/myposts");
    return res.data;
  } catch (error) {
    return [];
  }
};

export const getUserPosts = async (userId) => {
  try {
    const res = await api.get(`/posts/user/${userId}`);
    return res.data;
  } catch (error) {
    return [];
  }
};

export const likePost = async (postId) => {
  try {
    const res = await api.post(`/posts/${postId}/like`);
    return res.data;
  } catch (error) {
    console.log('Like error:', error);
    return null;
  }
};

export const unlikePost = async (postId) => {
  try {
    const res = await api.delete(`/posts/${postId}/like`);
    return res.data;
  } catch (error) {
    console.log('Unlike error:', error);
    return null;
  }
};

export const updatePost = async (postId, postData) => {
  try {
    const res = await api.put(`/posts/${postId}`, postData);
    return res.data;
  } catch (error) {
    console.log('Update post error:', error);
    throw error;
  }
};

export const deletePost = async (postId) => {
  try {
    const res = await api.delete(`/posts/${postId}`);
    return res.data;
  } catch (error) {
    console.log('Delete post error:', error);
    throw error;
  }
};

// ================================
// USER
// ================================
export const getCurrentUser = async () => {
  try {
    const res = await api.get("/users/me");
    return { success: true, user: res.data };
  } catch (error) {
    console.log("Get current user error:", error.response?.data || error.message);
    return { success: false, message: "Failed to fetch user" };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  } catch (error) {
    console.log("Fetch profile error:", error.response?.data || error.message);
    return null;
  }
};

export const updateUserProfile = async (userId, payload) => {
  try {
    const res = await api.put(`/users/${userId}`, payload);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Update failed",
    };
  }
};

export const sendHeartbeat = async () => {
  try {
    await api.post("/users/heartbeat");
  } catch (error) {
    // silently fail
  }
};

// ================================
// BOOKINGS
// ================================
export const getMyBookings = async () => {
  try {
    const response = await api.get('/bookings');
    return response.data; // { success, data }
  } catch (error) {
    console.log('Get bookings error:', error);
    throw error;
  }
};
 
export const getBookingById = async (bookingId) => {
  try {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.log('Get booking by ID error:', error);
    throw error;
  }
};

export const markBookingCompleted = async (bookingId) => {
  try {
    const response = await api.put(`/bookings/${bookingId}/complete`);
    return response.data;
  } catch (error) {
    console.log('Mark completed error:', error);
    throw error;
  }
};

export const confirmBookingCompletion = async (bookingId) => {
  try {
    const response = await api.put(`/bookings/${bookingId}/confirm`);
    return response.data;
  } catch (error) {
    console.log('Confirm completion error:', error);
    throw error;
  }
};

export const acceptBooking = async (bookingId) => {
  try {
    const response = await api.put(`/bookings/${bookingId}/accept`);
    return response.data;
  } catch (error) {
    console.log('Accept booking error:', error);
    throw error;
  }
};

export const rejectBooking = async (bookingId) => {
  try {
    const response = await api.put(`/bookings/${bookingId}/reject`);
    return response.data;
  } catch (error) {
    console.log('Reject booking error:', error);
    throw error;
  }
};

// ✅ FIXED: cancelBookingRequest with manual token fallback
export const cancelBookingRequest = async (bookingId) => {
  console.log("📞 [cancelBookingRequest] Called with ID:", bookingId);
  try {
    // Manually get token to ensure it's available
    const token = await AsyncStorage.getItem("userToken");
    console.log("📞 [cancelBookingRequest] Token exists:", !!token);
    if (!token) throw new Error("No token available");

    // Use api instance but override headers just in case
    const response = await api.put(
      `/bookings/${bookingId}/cancel-request`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("📞 [cancelBookingRequest] Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("📞 [cancelBookingRequest] Error:", error.response?.data || error.message);
    throw error;
  }
};

// ================================
// WALLET
// ================================
export const getWalletBalance = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const response = await api.get("/wallet/balance", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get wallet balance error:", error);
    throw error;
  }
};

export const requestWithdrawal = async (amount) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const response = await api.post("/wallet/withdraw", { amount }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.log("Withdrawal error:", error);
    throw error;
  }
};

// ================================
// REVIEWS
// ================================
export const submitReview = async (bookingId, rating, comment) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const response = await api.post(
      `/bookings/${bookingId}/review`,
      { rating, comment },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.log("Submit review error:", error);
    throw error;
  }
};

export const getUserReviews = async (userId, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/users/${userId}/reviews?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.log("Get user reviews error:", error);
    return { success: false, data: [] };
  }
};

// ================================
// NOTIFICATIONS
// ================================

export const getNotifications = async (page = 1, limit = 20, unreadOnly = false) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const url = `/notifications?page=${page}&limit=${limit}${unreadOnly ? '&unreadOnly=true' : ''}`;
    console.log("🔔 [API] Fetching notifications:", url);
    
    const response = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    console.log("🔔 [API] Notifications response:", response.data);
    return response.data;
  } catch (error) {
    console.log("❌ Get notifications error:", error.response?.data || error.message);
    return { success: false, data: [] };
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const response = await api.get("/notifications/unread-count", {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    console.log("🔔 [API] Unread count:", response.data);
    return response.data;
  } catch (error) {
    console.log("❌ Unread count error:", error.response?.data || error.message);
    return { success: false, count: 0 };
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const response = await api.put(`/notifications/${notificationId}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.log("❌ Mark read error:", error.response?.data || error.message);
    return { success: false };
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) throw new Error("No token found");

    const response = await api.put("/notifications/read-all", {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.log("❌ Mark all read error:", error.response?.data || error.message);
    return { success: false };
  }
};

// ================================
// EXPORT API INSTANCE (if needed)
// ================================
export { api };