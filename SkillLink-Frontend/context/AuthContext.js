import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token when the app starts
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");

        if (token) {
          setUserToken(token);
        }
      } catch (error) {
        console.log("Token load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  // Login function
  const login = async (token) => {
    try {
      await AsyncStorage.setItem("userToken", token);
      setUserToken(token);
    } catch (error) {
      console.log("Login error:", error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      setUserToken(null);
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ login, logout, userToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};