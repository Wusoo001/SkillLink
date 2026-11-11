import axios from "axios";

// Fail loudly at build time if the API URL is missing.
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not set. The admin panel cannot run without it. " +
    "Set it in .env (dev) or your hosting platform's env vars (prod)."
  );
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000, // 60s — allows for Render free-tier cold starts
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      // Always clear the stale token first
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");

      // Only redirect + notify if we're not already on the login page
      // (avoids loop and avoids showing "session expired" on bad-password attempts)
      if (window.location.pathname !== "/login") {
        sessionStorage.setItem("authNotice", "expired");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);