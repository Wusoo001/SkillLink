import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useState } from "react";

export const AuthContext = createContext(); // ✅ MUST exist

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);

  const login = async (token) => {
    await AsyncStorage.setItem("userToken", token);
    setUserToken(token);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("userToken");
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ login, logout, userToken }}>
      {children}
    </AuthContext.Provider>
  );
};
