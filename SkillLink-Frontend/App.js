import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { ActivityIndicator, View, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Landing from "./src/screens/LandingScreen";
import Register from "./src/screens/Register";
import HomeScreen from "./src/screens/HomeScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import BookingScreen from "./src/screens/BookingScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import { PostProvider } from "./context/PostContext";
import PaymentScreen from "./src/screens/PaymentScreen";
import PaymentReturnHandler from "./src/screens/PaymentReturnHandler";
import Dashboard from "./src/screens/Dashboard";
import BankSetupScreen from "./src/screens/BankSetupScreen";
import { ThemeProvider } from "./src/context/ThemeContext";
import { sendHeartbeat } from "./src/services/api";
import SplashLogo from "./src/components/SplashLogo";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tabs for logged-in users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0A66FF",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyProfile" component={UserProfileScreen} />
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
      <Stack.Screen name="PaymentReturnHandler" component={PaymentReturnHandler} />
      <Stack.Screen name="PaymentDashboard" component={Dashboard} />
      <Stack.Screen name="BankSetup" component={BankSetupScreen} />
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

    // Send heartbeat immediately on mount
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000); // every 30 seconds

    // Listen for app state changes (background/foreground)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App came to foreground – send heartbeat immediately
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsReady(true);
        setShowSplash(false);
      }
    };
    restoreNavigationState();
  }, []);

 // Inside RootNavigator, replace the loading return with:
  if (loading || !isReady) {
    return <SplashLogo/>; // instead of the ActivityIndicator
  }

  return (
    <>
      <HeartbeatManager />
      <NavigationContainer
        initialState={initialState}
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