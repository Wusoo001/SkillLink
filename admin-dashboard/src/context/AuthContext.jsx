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
    try {
      const res = await api.post("/auth/admin-login", { email, password });

      if (!res.data?.token || !res.data?.user) {
        throw new Error("Invalid credentials.");
      }

      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminUser", JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Invalid credentials.");
      }
      if (error.response?.status === 403) {
        throw new Error("This account cannot access the admin panel.");
      }
      if (error.response?.status === 429) {
        throw new Error("Too many login attempts. Please try again in 15 minutes.");
      }
      throw new Error(
        error.response?.data?.message || error.message || "Login failed."
      );
    }
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