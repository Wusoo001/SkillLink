import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE = "http://192.168.1.38:5000/api";

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
export const getPosts = async (page = 1) => {
  try {
    const res = await api.get(`/posts?page=${page}`);
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
    return {
      success: false,
      message: error.response?.data?.message || "Create post failed",
    };
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
// EXPORT API INSTANCE (if needed)
// ================================
export { api };