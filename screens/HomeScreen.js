// screens/HomeScreen.js - Updated with Go Green filter and GBP currency
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import {
  RESTAURANT_TYPE_COLORS,
  getRestaurantTypeColor,
  getAllRestaurantTypes,
  getRestaurantTypeInfo,
  getComplementaryColor,
  getGoGreenRestaurants,
  GO_GREEN_CONFIG,
} from "../utils/restaurantTypes";

const { width, height } = Dimensions.get("window");

// Fallback location (Cardiff, UK) - city-level zoom
const FALLBACK_REGION = {
  latitude: 51.4816,
  longitude: -3.1791,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function HomeScreen({ navigation }) {
  const { restaurants, loading, toggleFavorite } = useData();
  const { user } = useAuth();
  const [showMap, setShowMap] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All");
  const [selectedGoGreenFilter, setSelectedGoGreenFilter] = useState("All"); // New Go Green filter
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const webViewRef = useRef(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [restaurants, searchQuery, selectedTypeFilter, selectedGoGreenFilter]);

  useEffect(() => {
    // Update map when filtered restaurants change
    if (webViewRef.current && filteredRestaurants.length > 0 && showMap) {
      updateMapMarkers();
    }
  }, [filteredRestaurants, userLocation, showMap]);

  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      console.log("🌍 Requesting location permission...");

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        console.log(
          "✅ Location permission granted, getting current position..."
        );

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });

        const { latitude, longitude } = location.coords;
        console.log("📍 Current location:", latitude, longitude);

        if (
          latitude &&
          longitude &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        ) {
          const currentLocationRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };

          setUserLocation({ latitude, longitude });
          setMapRegion(currentLocationRegion);
          console.log("✅ Map region set to current location");
        } else {
          console.log("❌ Invalid coordinates received, using fallback");
          setMapRegion(FALLBACK_REGION);
        }
      } else {
        console.log("❌ Location permission denied, using fallback location");
        setMapRegion(FALLBACK_REGION);

        setTimeout(() => {
          Alert.alert(
            "Location Access",
            "Location access was denied. You can still browse restaurants, but we won't be able to show nearby ones or calculate distances.",
            [{ text: "OK" }]
          );
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Error getting location:", error);
      console.log("🔄 Falling back to default location");
      setMapRegion(FALLBACK_REGION);

      if (error.code === "E_LOCATION_TIMEOUT") {
        console.log("Location request timed out");
      } else if (error.code === "E_LOCATION_UNAVAILABLE") {
        console.log("Location services unavailable");
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const filterRestaurants = () => {
    if (!restaurants || restaurants.length === 0) {
      setFilteredRestaurants([]);
      return;
    }

    let filtered = restaurants;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((restaurant) => {
        if (!restaurant) return false;

        const name = restaurant.name?.toLowerCase() || "";
        const cuisine = restaurant.cuisine?.toLowerCase() || "";
        const type = restaurant.type?.toLowerCase() || "";
        const address = restaurant.location?.address?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();

        return (
          name.includes(query) ||
          cuisine.includes(query) ||
          type.includes(query) ||
          address.includes(query)
        );
      });
    }

    // Apply type filter
    if (selectedTypeFilter !== "All") {
      filtered = filtered.filter(
        (restaurant) => restaurant.type === selectedTypeFilter
      );
    }

    // Apply Go Green filter
    if (selectedGoGreenFilter === "Go Green Only") {
      filtered = filtered.filter((restaurant) => restaurant.isGoGreen === true);
    } else if (selectedGoGreenFilter === "Non-Go Green") {
      filtered = filtered.filter((restaurant) => restaurant.isGoGreen !== true);
    }

    setFilteredRestaurants(filtered);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  const isValidRestaurant = (restaurant) => {
    return (
      restaurant &&
      restaurant.location &&
      typeof restaurant.location.latitude === "number" &&
      typeof restaurant.location.longitude === "number" &&
      restaurant.location.latitude >= -90 &&
      restaurant.location.latitude <= 90 &&
      restaurant.location.longitude >= -180 &&
      restaurant.location.longitude <= 180
    );
  };

  const updateMapMarkers = () => {
    if (!webViewRef.current || !mapRegion) return;

    const validRestaurants = filteredRestaurants.filter(isValidRestaurant);

    const mapData = {
      center: [mapRegion.latitude, mapRegion.longitude],
      userLocation: userLocation
        ? [userLocation.latitude, userLocation.longitude]
        : null,
      restaurants: validRestaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        position: [restaurant.location.latitude, restaurant.location.longitude],
        type: restaurant.type || "Restaurant",
        cuisine: restaurant.cuisine,
        rating: restaurant.rating || 0,
        color: getRestaurantTypeColor(restaurant.type),
        isOwned: user && restaurant.ownerId === user.uid,
        isFavorite: user?.favoriteRestaurants?.includes(restaurant.id),
        isGoGreen: restaurant.isGoGreen === true,
      })),
    };

    const message = JSON.stringify({ type: "updateMarkers", data: mapData });
    webViewRef.current.postMessage(message);
  };

  const handleMapMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === "markerClick") {
        const restaurant = restaurants.find(
          (r) => r.id === message.restaurantId
        );
        if (restaurant) {
          navigation.navigate("RestaurantDetail", { restaurant });
        }
      } else if (message.type === "mapReady") {
        console.log("Map is ready");
        updateMapMarkers();
      }
    } catch (error) {
      console.error("Error handling map message:", error);
    }
  };

  const generateMapHTML = () => {
    const centerLat = mapRegion?.latitude || FALLBACK_REGION.latitude;
    const centerLng = mapRegion?.longitude || FALLBACK_REGION.longitude;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
          <style>
            #map { 
              height: 100vh; 
              margin: 0; 
              padding: 0; 
              width: 100%;
            }
            html, body { 
              margin: 0; 
              padding: 0; 
              height: 100%;
            }
            .custom-marker {
              background: white;
              border: 3px solid;
              border-radius: 50%;
              width: 35px;
              height: 35px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              position: relative;
              font-weight: bold;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            .marker-badge {
              position: absolute;
              top: -3px;
              right: -3px;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              border: 2px solid white;
              font-size: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .owner-badge { 
              background: #4CAF50; 
              color: white;
            }
            .favorite-badge { 
              background: #FF6B35; 
              color: white;
            }
            .go-green-badge {
              background: #4CAF50;
              color: white;
            }
            .type-marker {
              position: absolute;
              bottom: -5px;
              left: 50%;
              transform: translateX(-50%);
              padding: 2px 6px;
              border-radius: 8px;
              font-size: 8px;
              font-weight: bold;
              color: white;
              white-space: nowrap;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let map;
            let markers = [];

            function initMap() {
              map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
              
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
              }).addTo(map);

              // Notify React Native that map is ready
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapReady'
                }));
              }
            }

            function clearMarkers() {
              markers.forEach(marker => map.removeLayer(marker));
              markers = [];
            }

            function addUserLocation(position) {
              if (position) {
                const userMarker = L.marker(position, {
                  icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background: #2196F3; color: white; border-color: #2196F3;">📍</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                  })
                });
                
                userMarker.addTo(map);
                userMarker.bindPopup("You are here");
                markers.push(userMarker);
              }
            }

            function getRestaurantIcon(type, isGoGreen) {
              if (isGoGreen) {
                return '🌱';
              }
              
              const typeIcons = {
                'Fine Dining': '🍽️',
                'Casual Dining': '🍴',
                'Cafe': '☕',
                'Fast Food': '🍟',
                'Buffet': '🍽️',
                'Food Truck': '🚚',
                'Bakery': '🥖',
                'Dessert Shop': '🍨',
                'Bar': '🍺',
                'Pub': '🍻'
              };
              return typeIcons[type] || '🍽️';
            }

            function getTypeAbbreviation(type) {
              const abbreviations = {
                'Fine Dining': 'FD',
                'Casual Dining': 'CD',
                'Cafe': 'CF',
                'Fast Food': 'FF',
                'Buffet': 'BF',
                'Food Truck': 'FT',
                'Bakery': 'BK',
                'Dessert Shop': 'DS',
                'Bar': 'BR',
                'Pub': 'PB'
              };
              return abbreviations[type] || type.substring(0, 2).toUpperCase();
            }

            function addRestaurantMarkers(restaurants) {
              restaurants.forEach(restaurant => {
                const icon = getRestaurantIcon(restaurant.type, restaurant.isGoGreen);
                const typeAbbr = getTypeAbbreviation(restaurant.type);
                
                const markerIcon = L.divIcon({
                  className: 'custom-marker',
                  html: \`
                    <div style="border-color: \${restaurant.color}; background: \${restaurant.color}; color: white;">
                      \${icon}
                      \${restaurant.isOwned ? '<div class="marker-badge owner-badge">✓</div>' : ''}
                      \${restaurant.isFavorite && !restaurant.isOwned ? '<div class="marker-badge favorite-badge">♥</div>' : ''}
                      \${restaurant.isGoGreen && !restaurant.isOwned && !restaurant.isFavorite ? '<div class="marker-badge go-green-badge">🌱</div>' : ''}
                      <div class="type-marker" style="background: \${restaurant.color};">\${typeAbbr}</div>
                    </div>
                  \`,
                  iconSize: [35, 35],
                  iconAnchor: [17, 17]
                });

                const marker = L.marker(restaurant.position, { icon: markerIcon });
                
                marker.bindPopup(\`
                  <div style="min-width: 200px;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
                      <div style="background: \${restaurant.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                        \${restaurant.type}
                      </div>
                      \${restaurant.isGoGreen ? '<div style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">🌱 GO GREEN</div>' : ''}
                      \${restaurant.isOwned ? '<div style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">OWNED</div>' : ''}
                    </div>
                    <strong style="font-size: 16px;">\${restaurant.name}</strong><br/>
                    <div style="color: #666; margin: 4px 0;">\${restaurant.cuisine}</div>
                    \${restaurant.isGoGreen ? '<div style="color: #4CAF50; font-size: 12px; margin: 4px 0;">♻️ Eco-friendly restaurant</div>' : ''}
                    <div style="display: flex; align-items: center; margin-top: 8px;">
                      <span style="color: #FFD700;">★</span>
                      <span style="margin-left: 4px;">\${restaurant.rating.toFixed(1)}</span>
                      \${restaurant.isFavorite ? '<span style="color: #FF6B35; margin-left: 8px;">♥ Favorite</span>' : ''}
                    </div>
                  </div>
                \`);

                marker.on('click', () => {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'markerClick',
                      restaurantId: restaurant.id
                    }));
                  }
                });

                marker.addTo(map);
                markers.push(marker);
              });
            }

            function updateMarkers(data) {
              clearMarkers();
              
              if (data.center) {
                map.setView(data.center, 13);
              }

              if (data.userLocation) {
                addUserLocation(data.userLocation);
              }

              if (data.restaurants) {
                addRestaurantMarkers(data.restaurants);
              }
            }

            // Handle messages from React Native
            document.addEventListener('message', function(event) {
              try {
                const message = JSON.parse(event.data);
                if (message.type === 'updateMarkers') {
                  updateMarkers(message.data);
                }
              } catch (error) {
                console.error('Error handling message:', error);
              }
            });

            // For Android
            window.addEventListener('message', function(event) {
              try {
                const message = JSON.parse(event.data);
                if (message.type === 'updateMarkers') {
                  updateMarkers(message.data);
                }
              } catch (error) {
                console.error('Error handling message:', error);
              }
            });

            // Initialize map when page loads
            initMap();
          </script>
        </body>
      </html>
    `;
  };

  // Get available restaurant types from current restaurants
  const getAvailableTypes = () => {
    const types = new Set();
    restaurants.forEach((restaurant) => {
      if (restaurant.type) {
        types.add(restaurant.type);
      }
    });
    return Array.from(types).sort();
  };

  const handleAddRestaurant = () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login or create an account to add a restaurant.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }
    navigation.navigate("AddRestaurant");
  };

  const handleFavoriteToggle = async (restaurantId) => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login to save favorite restaurants.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    try {
      console.log("🔄 Toggling favorite for restaurant:", restaurantId);
      const result = await toggleFavorite(restaurantId);

      if (result.success) {
        const isFavorite = user.favoriteRestaurants?.includes(restaurantId);
        const message = isFavorite
          ? "Removed from favorites"
          : "Added to favorites";
        console.log("✅ Favorite toggled successfully:", message);
      } else {
        Alert.alert("Error", result.error || "Failed to update favorites");
      }
    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
      Alert.alert("Error", "Failed to update favorites. Please try again.");
    }
  };

  const renderTypeFilter = () => {
    const availableTypes = getAvailableTypes();

    if (availableTypes.length === 0) return null;

    return (
      <View style={styles.typeFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* All filter */}
          <TouchableOpacity
            style={[
              styles.typeFilterChip,
              selectedTypeFilter === "All" && styles.selectedTypeFilterChip,
            ]}
            onPress={() => setSelectedTypeFilter("All")}
          >
            <Text
              style={[
                styles.typeFilterText,
                selectedTypeFilter === "All" && styles.selectedTypeFilterText,
              ]}
            >
              All
            </Text>
            <View style={styles.typeFilterCount}>
              <Text style={styles.typeFilterCountText}>
                {restaurants.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Individual type filters */}
          {availableTypes.map((type) => {
            const count = restaurants.filter((r) => r.type === type).length;
            const typeColor = getRestaurantTypeColor(type);

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeFilterChip,
                  selectedTypeFilter === type && [
                    styles.selectedTypeFilterChip,
                    { backgroundColor: typeColor },
                  ],
                ]}
                onPress={() => setSelectedTypeFilter(type)}
              >
                <View
                  style={[styles.typeColorDot, { backgroundColor: typeColor }]}
                />
                <Text
                  style={[
                    styles.typeFilterText,
                    selectedTypeFilter === type &&
                      styles.selectedTypeFilterText,
                  ]}
                >
                  {type}
                </Text>
                <View style={styles.typeFilterCount}>
                  <Text
                    style={[
                      styles.typeFilterCountText,
                      selectedTypeFilter === type && { color: "#fff" },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderGoGreenFilter = () => {
    const goGreenCount = restaurants.filter((r) => r.isGoGreen === true).length;
    const nonGoGreenCount = restaurants.length - goGreenCount;

    if (goGreenCount === 0) return null;

    return (
      <View style={styles.goGreenFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.goGreenFilterChip,
              selectedGoGreenFilter === "All" &&
                styles.selectedGoGreenFilterChip,
            ]}
            onPress={() => setSelectedGoGreenFilter("All")}
          >
            <Text
              style={[
                styles.goGreenFilterText,
                selectedGoGreenFilter === "All" &&
                  styles.selectedGoGreenFilterText,
              ]}
            >
              All Restaurants
            </Text>
            <View style={styles.goGreenFilterCount}>
              <Text style={styles.goGreenFilterCountText}>
                {restaurants.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.goGreenFilterChip,
              selectedGoGreenFilter === "Go Green Only" && [
                styles.selectedGoGreenFilterChip,
                { backgroundColor: GO_GREEN_CONFIG.color },
              ],
            ]}
            onPress={() => setSelectedGoGreenFilter("Go Green Only")}
          >
            <Text style={styles.goGreenIcon}>{GO_GREEN_CONFIG.icon}</Text>
            <Text
              style={[
                styles.goGreenFilterText,
                selectedGoGreenFilter === "Go Green Only" && { color: "#fff" },
              ]}
            >
              Go Green Only
            </Text>
            <View style={styles.goGreenFilterCount}>
              <Text
                style={[
                  styles.goGreenFilterCountText,
                  selectedGoGreenFilter === "Go Green Only" && {
                    color: "#fff",
                  },
                ]}
              >
                {goGreenCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.goGreenFilterChip,
              selectedGoGreenFilter === "Non-Go Green" &&
                styles.selectedGoGreenFilterChip,
            ]}
            onPress={() => setSelectedGoGreenFilter("Non-Go Green")}
          >
            <Text
              style={[
                styles.goGreenFilterText,
                selectedGoGreenFilter === "Non-Go Green" &&
                  styles.selectedGoGreenFilterText,
              ]}
            >
              Traditional
            </Text>
            <View style={styles.goGreenFilterCount}>
              <Text
                style={[
                  styles.goGreenFilterCountText,
                  selectedGoGreenFilter === "Non-Go Green" && { color: "#fff" },
                ]}
              >
                {nonGoGreenCount}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderRestaurantCard = ({ item }) => {
    if (!item) return null;

    const distance =
      userLocation && isValidRestaurant(item)
        ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            item.location.latitude,
            item.location.longitude
          )
        : null;

    const isOwner = user && item.ownerId === user.uid;
    const isFavorite = user?.favoriteRestaurants?.includes(item.id);
    const typeColor = getRestaurantTypeColor(item.type);
    const typeInfo = getRestaurantTypeInfo(item.type);
    const textColor = getComplementaryColor(item.type);

    // Get restaurant type icon
    const getTypeIcon = (type) => {
      const typeIcons = {
        "Fine Dining": "🍽️",
        "Casual Dining": "🍴",
        Cafe: "☕",
        "Fast Food": "🍟",
        Buffet: "🍽️",
        "Food Truck": "🚚",
        Bakery: "🥖",
        "Dessert Shop": "🍨",
        Bar: "🍺",
        Pub: "🍻",
      };
      return typeIcons[type] || "🍽️";
    };

    return (
      <TouchableOpacity
        style={[
          styles.restaurantCard,
          {
            borderLeftColor: item.isGoGreen ? GO_GREEN_CONFIG.color : typeColor,
            borderLeftWidth: 4,
          },
        ]}
        onPress={() =>
          navigation.navigate("RestaurantDetail", { restaurant: item })
        }
      >
        <Image
          source={{
            uri:
              item.image ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
          }}
          style={styles.restaurantImage}
          onError={() => console.log("Image load error for:", item.name)}
        />
        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantName}>
              {item.name || "Unknown Restaurant"}
            </Text>
            <View style={styles.restaurantBadges}>
              {item.isGoGreen && (
                <View
                  style={[
                    styles.goGreenBadge,
                    { backgroundColor: GO_GREEN_CONFIG.badgeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.goGreenBadgeText,
                      { color: GO_GREEN_CONFIG.textColor },
                    ]}
                  >
                    {GO_GREEN_CONFIG.icon} GO GREEN
                  </Text>
                </View>
              )}
              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>OWNED</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.restaurantTypeContainer}>
            <Text style={styles.restaurantCuisine}>
              {item.cuisine || "Cuisine"}
            </Text>
            {item.type && (
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <Text style={[styles.typeBadgeText, { color: textColor }]}>
                  {getTypeIcon(item.type)} {item.type}
                </Text>
              </View>
            )}
          </View>

          {typeInfo?.description && (
            <Text style={styles.typeDescription}>{typeInfo.description}</Text>
          )}

          {item.isGoGreen && (
            <Text style={styles.goGreenDescription}>
              ♻️ Eco-friendly practices • Sustainable packaging • Local
              ingredients
            </Text>
          )}

          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>
              {item.rating?.toFixed(1) || "0.0"}
            </Text>
            <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
            <View style={[styles.ratingBadge, { backgroundColor: typeColor }]}>
              <Text style={[styles.ratingBadgeText, { color: textColor }]}>
                {item.type || "Restaurant"}
              </Text>
            </View>
          </View>
          <Text style={styles.address}>
            {item.location?.address || "Address not available"}
          </Text>
          {distance && <Text style={styles.distance}>{distance} km away</Text>}
        </View>
        <View style={styles.favoriteContainer}>
          <TouchableOpacity
            style={[
              styles.favoriteButton,
              isFavorite && { backgroundColor: typeColor },
            ]}
            onPress={() => handleFavoriteToggle(item.id)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? textColor : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || locationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>
          {locationLoading
            ? "Getting your location..."
            : "Loading restaurants..."}
        </Text>
        {locationLoading && (
          <Text style={styles.loadingSubtext}>
            This helps us show nearby restaurants
          </Text>
        )}
      </View>
    );
  }

  if (!mapRegion) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Setting up map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Restaurants</Text>
        <View style={styles.headerActions}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, showMap && styles.activeToggle]}
              onPress={() => setShowMap(true)}
            >
              <Ionicons
                name="map-outline"
                size={20}
                color={showMap ? "#fff" : "#FF6B35"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !showMap && styles.activeToggle]}
              onPress={() => setShowMap(false)}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={!showMap ? "#fff" : "#FF6B35"}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddRestaurant}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants, cuisine, type, or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery("")}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Go Green Filter */}
      {renderGoGreenFilter()}

      {/* Restaurant Type Filter */}
      {renderTypeFilter()}

      {/* Restaurant Type Legend for Map View */}
      {showMap &&
        selectedTypeFilter === "All" &&
        selectedGoGreenFilter === "All" && (
          <View style={styles.legendContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.legendItem}>
                <Text
                  style={[
                    styles.legendColorDot,
                    { color: GO_GREEN_CONFIG.color },
                  ]}
                >
                  {GO_GREEN_CONFIG.icon}
                </Text>
                <Text style={styles.legendText}>Go Green</Text>
              </View>
              {Object.entries(RESTAURANT_TYPE_COLORS).map(([type, color]) => (
                <View key={type} style={styles.legendItem}>
                  <View
                    style={[styles.legendColorDot, { backgroundColor: color }]}
                  />
                  <Text style={styles.legendText}>{type}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      {showMap ? (
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          onMessage={handleMapMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error: ", nativeEvent);
            Alert.alert(
              "Map Error",
              "There was an issue loading the map. Please try again."
            );
          }}
          onLoadEnd={() => {
            console.log("WebView loaded");
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text>Loading map...</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurantCard}
          keyExtractor={(item) =>
            item?.id?.toString() || Math.random().toString()
          }
          style={styles.restaurantList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {selectedGoGreenFilter === "Go Green Only"
                  ? "No Go Green restaurants found"
                  : selectedTypeFilter === "All"
                  ? "No restaurants found"
                  : `No ${selectedTypeFilter} restaurants found`}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedGoGreenFilter === "Go Green Only"
                  ? "Try adding your first Go Green restaurant!"
                  : selectedTypeFilter === "All"
                  ? "Be the first to add a restaurant!"
                  : "Try searching for a different type or add one yourself!"}
              </Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={handleAddRestaurant}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addFirstButtonText}>Add Restaurant</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Add Button for Map View */}
      {showMap && (
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={handleAddRestaurant}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  webViewLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 2,
    marginRight: 10,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  activeToggle: {
    backgroundColor: "#FF6B35",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    margin: 15,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 5,
  },
  // Go Green Filter Styles
  goGreenFilterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  goGreenFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedGoGreenFilterChip: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  goGreenIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  goGreenFilterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginRight: 6,
  },
  selectedGoGreenFilterText: {
    color: "#fff",
  },
  goGreenFilterCount: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  goGreenFilterCountText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "bold",
  },
  // Type Filter Styles
  typeFilterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  typeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedTypeFilterChip: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  typeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  typeFilterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginRight: 6,
  },
  selectedTypeFilterText: {
    color: "#fff",
  },
  typeFilterCount: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  typeFilterCountText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "bold",
  },
  // Restaurant Type Legend Styles
  legendContainer: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  map: {
    flex: 1,
  },
  restaurantList: {
    flex: 1,
    padding: 15,
  },
  restaurantCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantImage: {
    width: 100,
    height: 120,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  restaurantInfo: {
    flex: 1,
    padding: 12,
  },
  restaurantHeader: {
    marginBottom: 4,
  },
  restaurantBadges: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  goGreenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goGreenBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  ownerBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ownerBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  restaurantTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: "#666",
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  typeDescription: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    fontStyle: "italic",
  },
  goGreenDescription: {
    fontSize: 11,
    color: "#4CAF50",
    marginBottom: 4,
    fontWeight: "500",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: "#999",
  },
  ratingBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  address: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  distance: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "600",
  },
  favoriteContainer: {
    padding: 12,
    justifyContent: "flex-start",
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8f8f8",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    marginBottom: 20,
    textAlign: "center",
  },
  addFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFirstButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#4CAF50",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
