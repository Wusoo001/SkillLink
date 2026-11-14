import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { ActivityIndicator, View, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Landing from "./src/screens/LandingScreen";
import Register from "./src/screens/Register";
import HomeScreen from "./src/screens/HomeScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import BookingScreen from "./src/screens/BookingScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import { PostProvider } from "./context/PostContext";
import PaymentScreen from "./src/screens/PaymentScreen";
import Dashboard from "./src/screens/Dashboard";
import BankSetupScreen from "./src/screens/BankSetupScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { sendHeartbeat } from "./src/services/api";
import SplashLogo from "./src/components/SplashLogo";
import ReviewsScreen from "./src/screens/ReviewsScreen";
import { setLogoutCallback } from "./src/services/logout";
import VerificationPendingScreen from "./src/screens/VerificationPendingScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import TermsScreen from "./src/screens/TermsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import AccountRestrictedScreen from "./src/screens/AccountRestrictedScreen";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import PaymentReturnScreen from "./src/screens/PaymentReturnScreen";
import StoresScreen from "./src/screens/StoresScreen";
import CreateProductScreen from "./src/screens/CreateProductScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import MyProductsScreen from "./src/screens/MyProductsScreen";
import CirclesScreen from "./src/screens/CirclesScreen";
import CircleDetailScreen from "./src/screens/CircleDetailScreen";
import CreateRequestScreen from "./src/screens/CreateRequestScreen";
import RequestDetailScreen from "./src/screens/RequestDetailScreen";


const linking = {
  prefixes: [
    Linking.createURL("/"),
    "streetapp://",
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : "",
  ].filter(Boolean),
  config: {
    screens: {
      PaymentReturn: "payment-return",
    },
  },
};

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// =====================================================
// Bottom Tabs — Icon-based navigation with safe-area
// =====================================================
function MainTabs() {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.1,
          marginTop: -2,
          marginBottom: 4,
        },
        tabBarStyle: {
          // ✅ Height + padding adapt to phone's bottom safe area
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.inputBorder,
          backgroundColor: colors.card,
          elevation: 8,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "MyProfile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={focused ? 22 : 20}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="MyProfile"
        component={UserProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
      <Tab.Screen name="Dashboard" component={Dashboard} />
    </Tab.Navigator>
  );
}

// Stack for authentication screens
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={Landing} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} />
      <Stack.Screen name="AccountRestricted" component={AccountRestrictedScreen} />
      <Stack.Screen name="PaymentReturn" component={PaymentReturnScreen} />
    </Stack.Navigator>
  );
}

// Stack for logged-in app: Tabs + other user profile
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} options={{ title: "New Post" }} />
      <Stack.Screen name="UsersProfile" component={UserProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="BookingScreen" component={BookingScreen} />
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
      <Stack.Screen name="BankSetup" component={BankSetupScreen} />
      <Stack.Screen name="ReviewsScreen" component={ReviewsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="PaymentReturn" component={PaymentReturnScreen} />
      <Stack.Screen name="StoresScreen" component={StoresScreen} />
      <Stack.Screen name="MyProductsScreen" component={MyProductsScreen} />
      <Stack.Screen name="CreateProductScreen" component={CreateProductScreen} />
      <Stack.Screen name="ProductDetailScreen" component={ProductDetailScreen} />
      <Stack.Screen name="CirclesScreen" component={CirclesScreen} />
      <Stack.Screen name="CircleDetail" component={CircleDetailScreen} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
      <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
    </Stack.Navigator>
  );
}

// HeartbeatManager: sends periodic ping to update lastActive
function HeartbeatManager() {
  const { userToken } = useContext(AuthContext);
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userToken) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    sendHeartbeat();

    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        sendHeartbeat();
      }
      appState.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [userToken]);

  return null;
}

// Root navigator: decides whether to show Auth or App
function RootNavigator() {
  const { userToken, loading } = useContext(AuthContext);
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();
  const [showSplash, setShowSplash] = useState(true);
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    setLogoutCallback(logout);
    return () => setLogoutCallback(null);
  }, [logout]);

  // Restore navigation state on mount
  useEffect(() => {
    const restoreNavigationState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem("NAVIGATION_STATE");
        if (savedStateString) {
          setInitialState(JSON.parse(savedStateString));
        }
      } catch (e) {
        // ignore parsing errors
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsReady(true);
        setShowSplash(false);
      }
    };
    restoreNavigationState();
  }, []);

  if (loading || !isReady) {
    return <SplashLogo />;
  }

  return (
    <>
      <HeartbeatManager />
      <NavigationContainer
        linking={linking}
        onStateChange={(state) => {
          if (state) {
            AsyncStorage.setItem("NAVIGATION_STATE", JSON.stringify(state));
          }
        }}
      >
        {userToken ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
}

// App entry point
export default function App() {
  return (
    <ThemeProvider>
      <PostProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </PostProvider>
    </ThemeProvider>
  );
}