import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
const API_BASE = "http://192.168.1.22:5000/api"; // Replace with your IPv4 if needed
const AUTH_URL = `${API_BASE}/auth`;
const POSTS_URL = `${API_BASE}/posts`;

// Helper to get token
const getToken = async () => {
  try {
    return await AsyncStorage.getItem("userToken");
  } catch (error) {
    console.log("Error getting token:", error);
    return null;
  }
};

/*
========================================
REGISTER USER
========================================
*/
export const registerUser = async (userData) => {
  try {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    return { success: data.success || false, message: data.message || "" };
  } catch (error) {
    console.log("Register error:", error);
    return { success: false, message: "Network error" };
  }
};


/*
========================================
LOGIN USER
========================================
*/
export const loginUser = async (userData) => {
  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    return { success: !!data.token, token: data.token || null, message: data.message || "" };
  } catch (error) {
    console.log("Login error:", error);
    return { success: false, token: null, message: "Network error" };
  }
};

/*
========================================
GET POSTS (HOME FEED)
Supports pagination
========================================
*/
export const getPosts = async (page = 1) => {
  try {
    const token = await getToken();
    const res = await fetch(`${POSTS_URL}?page=${page}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return await res.json();
  } catch (error) {
    console.log("Fetch posts error:", error);
    return [];
  }
};

/*
========================================
SEARCH POSTS BY SKILL
========================================
*/
export const searchPosts = async (skill) => {
  try {
    const token = await getToken();
    const res = await fetch(`${POSTS_URL}/search?skill=${skill}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return await res.json();
  } catch (error) {
    console.log("Search error:", error);
    return [];
  }
};

/*
========================================
CREATE POST
Requires Authentication Token
========================================
*/
export const createPost = async (postData) => {
  try {
    const token = await getToken();
    const res = await fetch(`${POSTS_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(postData),
    });

    const data = await res.json();
    return { success: res.ok, ...data };
  } catch (err) {
    console.log("Create post error:", err);
    return { success: false, message: "Network error" };
  }
};

/*
========================================
SAVE / UNSAVE POST
========================================
*/
export const savePost = async (postId) => {
  try {
    const token = await getToken();
    const res = await fetch(`${POSTS_URL}/save/${postId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    return await res.json();
  } catch (error) {
    console.log("Save post error:", error);
    return null;
  }
};

/*
========================================
GET MY POSTS
========================================
*/
export const getMyPosts = async () => {
  try {
    const token = await getToken();
    const res = await fetch(`${POSTS_URL}/myposts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return await res.json();
  } catch (error) {
    console.log("My posts error:", error);
    return [];
  }
};

export const getUserProfile = async (userId, token) => {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.log("Fetch profile error:", error);
    return { success: false };
  }
};

export const getUserPosts = async (userId, token) => {
  try {
    const res = await fetch(`${API_BASE}/posts/user/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.log("Fetch user posts error:", error);
    return { success: false };
  }
};

/*
========================================
AXIOS INSTANCE (for screens like EditProfile)
========================================
*/

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { api };