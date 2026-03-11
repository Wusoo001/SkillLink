import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useContext } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";

import Landing from "./src/screens/LandingScreen";
import Register from "./src/screens/Register";
import Login from "./src/screens/Login";
import HomeScreen from "./src/screens/HomeScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import ProfileScreen from "./src/screens/ProfileScreen"; // other users
import SettingsScreen from "./src/screens/SettingsScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import { PostProvider } from "./context/PostContext";



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
      <Tab.Screen name="Profile" component={UserProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
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
      <Stack.Screen name="UsersProfile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// Root navigator: decides whether to show Auth or App
function RootNavigator() {
  const { userToken } = useContext(AuthContext);

  return (
    <NavigationContainer>
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