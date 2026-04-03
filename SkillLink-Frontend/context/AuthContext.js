import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);
   const [user, setUser] = useState(null);

  // Load token when the app starts
  useEffect(() => {
  const loadToken = async () => {
    
    try {
      const token = await AsyncStorage.getItem("userToken");
      const savedUser = await AsyncStorage.getItem("userData");

      if (token) {
        setUserToken(token);
      }

      // Check if savedUser exists AND is not the string "undefined"
      if (savedUser && savedUser !== "undefined") {
         const parsedUser = JSON.parse(savedUser);
         console.log("Loaded user:", parsedUser); // check if _id exists
         setUser(parsedUser);
        setUser(JSON.parse(savedUser));
        
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
  const login = async (token, userData) => {
    try {
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);
    } catch (error) {
      console.log("Login error:", error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem(["userToken", "userData"]);
      setUserToken(null);
      setUser(null);
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ login, logout, userToken, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};