// App.js - Complete app with integrated navigation
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { useAuth } from "./context/AuthContext";
import { useData } from "./context/DataContext";

// Import all screens
import HomeScreen from "./screens/HomeScreen";
import MyRestaurantsScreen from "./screens/MyRestaurantsScreen";
import RestaurantOrdersScreen from "./screens/RestaurantOrdersScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import RestaurantDetailScreen from "./screens/RestaurantDetailScreen";
import AddRestaurantScreen from "./screens/AddRestaurantScreen";
import EditRestaurantScreen from "./screens/EditRestaurantScreen";
import ManageMenuScreen from "./screens/ManageMenuScreen";
import UserOrderHistoryScreen from "./screens/OrderHistoryScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dynamic Bottom Tab Navigator
function MainTabsNavigator() {
  const { user } = useAuth();
  const { userOwnsRestaurants } = useData();

  // Check if user owns any restaurants
  const isRestaurantOwner = userOwnsRestaurants();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "MyRestaurants") {
            iconName = focused ? "restaurant" : "restaurant-outline";
          } else if (route.name === "RestaurantOrders") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          // marginBottom:20,
          borderTopColor: "#f0f0f0",
          paddingBottom: 15,
          paddingTop: 5,
          height: 100,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      })}
    >
      {/* Home Tab - Always visible */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
        }}
      />

      {/* My Restaurants Tab - Always visible */}
      <Tab.Screen
        name="MyRestaurants"
        component={MyRestaurantsScreen}
        options={{
          tabBarLabel: "My Restaurants",
        }}
      />

      {/* Restaurant Orders Tab - Only visible if user owns restaurants */}
      {isRestaurantOwner && (
        <Tab.Screen
          name="RestaurantOrders"
          component={RestaurantOrdersScreen}
          options={{
            tabBarLabel: "Orders",
          }}
        />
      )}

      {/* Profile Tab - Always visible */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    // We can return a loading screen here
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main Tabs - This includes the dynamic bottom navigation */}
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} />

      {/* Authentication Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          title: "Sign In",
          headerStyle: {
            backgroundColor: "#FF6B35",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          headerShown: true,
          title: "Create Account",
          headerStyle: {
            backgroundColor: "#FF6B35",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />

      {/* Restaurant Screens */}
      <Stack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
      />
      <Stack.Screen name="AddRestaurant" component={AddRestaurantScreen} />
      <Stack.Screen name="EditRestaurant" component={EditRestaurantScreen} />
      <Stack.Screen name="ManageMenu" component={ManageMenuScreen} />

      {/* Order Screens */}
      <Stack.Screen
        name="UserOrderHistory"
        component={UserOrderHistoryScreen}
      />
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </DataProvider>
    </AuthProvider>
  );
}
