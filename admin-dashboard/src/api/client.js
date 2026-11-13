import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not set. The admin panel cannot run without it."
  );
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
  withCredentials: true, // ← H1: send/receive httpOnly cookies
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminUser"); // ← no more adminToken to clear

      if (window.location.pathname !== "/login") {
        sessionStorage.setItem("authNotice", "expired");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);