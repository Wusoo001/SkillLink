import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useContext, useEffect, useState } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Landing from "./src/screens/LandingScreen";
import Register from "./src/screens/Register";
import Login from "./src/screens/Login";
import HomeScreen from "./src/screens/HomeScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import BookingScreen from "./src/screens/BookingScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import { PostProvider } from "./context/PostContext";
import PaymentScreen from "./src/screens/PaymentScreen";
import PaymentReturnHandler from "./src/screens/PaymentReturnHandler";
import Dashboard from "./src/screens/Dashboard";

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
      <Stack.Screen name="Login" component={Login} />
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
    </Stack.Navigator>
  );
}

// Root navigator: decides whether to show Auth or App
function RootNavigator() {
  const { userToken, loading } = useContext(AuthContext);
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

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
        setIsReady(true);
      }
    };
    restoreNavigationState();
  }, []);

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0A66FF" />
      </View>
    );
  }

  return (
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
  );
}

// App entry point
export default function App() {
  return (
    <PostProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </PostProvider>
  );
}