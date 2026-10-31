import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const savedUser = localStorage.getItem("adminUser");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (!res.data?.token || !res.data?.user) {
      throw new Error(res.data?.message || "Invalid credentials");
    }

    // Verify admin access
    const token = res.data.token;
    try {
      await api.get("/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error("This account does not have admin access.");
      }
      throw new Error(error.response?.data?.message || "Admin verification failed");
    }

    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUser", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);