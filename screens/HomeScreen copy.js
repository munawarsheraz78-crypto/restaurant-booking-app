// screens/HomeScreen.js - Updated with restaurant type filtering
import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Fallback location (Islamabad, Pakistan) - only used if location permission denied or fails
const FALLBACK_REGION = {
  latitude: 33.6844,
  longitude: 73.0479,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// Restaurant type colors mapping
const RESTAURANT_TYPE_COLORS = {
  'Go Green': '#4CAF50',
  'Fine Dining': '#8E24AA',
  'Casual Dining': '#FF7043',
  'Cafe': '#795548',
  'Fast Food': '#F44336',
  'Buffet': '#FF9800',
  'Food Truck': '#2196F3',
  'Bakery': '#FFEB3B',
  'Dessert Shop': '#E91E63',
  'Bar': '#9C27B0',
  'Pub': '#607D8B'
};

export default function HomeScreen({ navigation }) {
  const { restaurants, loading, toggleFavorite } = useData();
  const { user } = useAuth();
  const [showMap, setShowMap] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All'); // New state for type filter
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  
  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [restaurants, searchQuery, selectedTypeFilter]); // Added selectedTypeFilter dependency

  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('🌍 Requesting location permission...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permission granted, getting current position...');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
        
        const { latitude, longitude } = location.coords;
        console.log('📍 Current location:', latitude, longitude);
        
        if (latitude && longitude && 
            latitude >= -90 && latitude <= 90 && 
            longitude >= -180 && longitude <= 180) {
          
          const currentLocationRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          
          setUserLocation({ latitude, longitude });
          setMapRegion(currentLocationRegion);
          console.log('✅ Map region set to current location');
        } else {
          console.log('❌ Invalid coordinates received, using fallback');
          setMapRegion(FALLBACK_REGION);
        }
      } else {
        console.log('❌ Location permission denied, using fallback location');
        setMapRegion(FALLBACK_REGION);
        
        setTimeout(() => {
          Alert.alert(
            'Location Access',
            'Location access was denied. You can still browse restaurants, but we won\'t be able to show nearby ones or calculate distances.',
            [{ text: 'OK' }]
          );
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      console.log('🔄 Falling back to default location');
      setMapRegion(FALLBACK_REGION);
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        console.log('Location request timed out');
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        console.log('Location services unavailable');
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
      filtered = filtered.filter(restaurant => {
        if (!restaurant) return false;
        
        const name = restaurant.name?.toLowerCase() || '';
        const cuisine = restaurant.cuisine?.toLowerCase() || '';
        const type = restaurant.type?.toLowerCase() || '';
        const address = restaurant.location?.address?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        
        return name.includes(query) || 
               cuisine.includes(query) || 
               type.includes(query) ||
               address.includes(query);
      });
    }

    // Apply type filter
    if (selectedTypeFilter !== 'All') {
      filtered = filtered.filter(restaurant => 
        restaurant.type === selectedTypeFilter
      );
    }
    
    setFilteredRestaurants(filtered);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  const isValidRestaurant = (restaurant) => {
    return restaurant && 
           restaurant.location && 
           typeof restaurant.location.latitude === 'number' &&
           typeof restaurant.location.longitude === 'number' &&
           restaurant.location.latitude >= -90 && 
           restaurant.location.latitude <= 90 &&
           restaurant.location.longitude >= -180 && 
           restaurant.location.longitude <= 180;
  };

  const getRestaurantTypeColor = (type) => {
    if (!type) return "#000";
    return RESTAURANT_TYPE_COLORS[type] || "#000";
  };

  // Get available restaurant types from current restaurants
  const getAvailableTypes = () => {
    const types = new Set();
    restaurants.forEach(restaurant => {
      if (restaurant.type) {
        types.add(restaurant.type);
      }
    });
    return Array.from(types).sort();
  };

  const handleAddRestaurant = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login or create an account to add a restaurant.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    navigation.navigate('AddRestaurant');
  };

  const handleFavoriteToggle = async (restaurantId) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to save favorite restaurants.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    try {
      console.log('🔄 Toggling favorite for restaurant:', restaurantId);
      const result = await toggleFavorite(restaurantId);
      
      if (result.success) {
        const isFavorite = user.favoriteRestaurants?.includes(restaurantId);
        const message = isFavorite ? 'Removed from favorites' : 'Added to favorites';
        console.log('✅ Favorite toggled successfully:', message);
      } else {
        Alert.alert('Error', result.error || 'Failed to update favorites');
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
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
              selectedTypeFilter === 'All' && styles.selectedTypeFilterChip
            ]}
            onPress={() => setSelectedTypeFilter('All')}
          >
            <Text style={[
              styles.typeFilterText,
              selectedTypeFilter === 'All' && styles.selectedTypeFilterText
            ]}>
              All
            </Text>
            <View style={styles.typeFilterCount}>
              <Text style={styles.typeFilterCountText}>{restaurants.length}</Text>
            </View>
          </TouchableOpacity>

          {/* Individual type filters */}
          {availableTypes.map((type) => {
            const count = restaurants.filter(r => r.type === type).length;
            const typeColor = getRestaurantTypeColor(type);
            
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeFilterChip,
                  selectedTypeFilter === type && [
                    styles.selectedTypeFilterChip,
                    { backgroundColor: typeColor }
                  ]
                ]}
                onPress={() => setSelectedTypeFilter(type)}
              >
                <View style={[styles.typeColorDot, { backgroundColor: typeColor }]} />
                <Text style={[
                  styles.typeFilterText,
                  selectedTypeFilter === type && styles.selectedTypeFilterText
                ]}>
                  {type}
                </Text>
                <View style={styles.typeFilterCount}>
                  <Text style={[
                    styles.typeFilterCountText,
                    selectedTypeFilter === type && { color: '#fff' }
                  ]}>
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

  const renderRestaurantCard = ({ item }) => {
    if (!item) return null;

    const distance = userLocation && isValidRestaurant(item) ? 
      calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.location.latitude,
        item.location.longitude
      ) : null;

    const isOwner = user && item.ownerId === user.uid;
    const isFavorite = user?.favoriteRestaurants?.includes(item.id);
    const typeColor = getRestaurantTypeColor(item.type);

    return (
      <TouchableOpacity
        style={styles.restaurantCard}
        onPress={() => navigation.navigate('RestaurantDetail', { restaurant: item })}
      >
        <Image 
          source={{ 
            uri: item.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'
          }} 
          style={styles.restaurantImage}
          onError={() => console.log('Image load error for:', item.name)}
        />
        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantName}>{item.name || 'Unknown Restaurant'}</Text>
            {isOwner && (
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>OWNED</Text>
              </View>
            )}
          </View>
          
          <View style={styles.restaurantTypeContainer}>
            <Text style={styles.restaurantCuisine}>{item.cuisine || 'Cuisine'}</Text>
            {item.type && (
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <Text style={styles.typeBadgeText}>{item.type}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
          </View>
          <Text style={styles.address}>
            {item.location?.address || 'Address not available'}
          </Text>
          {distance && (
            <Text style={styles.distance}>{distance} km away</Text>
          )}
        </View>
        <View style={styles.favoriteContainer}>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleFavoriteToggle(item.id)}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={20} 
              color={isFavorite ? "#FF6B35" : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMapMarkers = () => {
    if (!filteredRestaurants || filteredRestaurants.length === 0) {
      return null;
    }

    return filteredRestaurants
      .filter(isValidRestaurant)
      .map((restaurant) => {
        const isOwner = user && restaurant.ownerId === user.uid;
        const isFavorite = user?.favoriteRestaurants?.includes(restaurant.id);
        const typeColor = getRestaurantTypeColor(restaurant.type);
        const iconColor = (restaurant.type ? typeColor : "#000");
        
        return (
          <Marker
            key={restaurant.id}
            coordinate={{
              latitude: restaurant.location.latitude,
              longitude: restaurant.location.longitude,
            }}
            title={restaurant.name}
            description={`${restaurant.type || 'Restaurant'} • ${restaurant.cuisine} • ${restaurant.rating?.toFixed(1) || '0.0'} ⭐`}
            onCalloutPress={() => navigation.navigate('RestaurantDetail', { restaurant })}
          >
            <View style={[
              styles.markerContainer, 
              { borderColor: restaurant.type ? typeColor : "#000" },
              isOwner && styles.ownedMarkerContainer
            ]}>
              <Ionicons 
                name="restaurant" 
                size={24} 
                color={iconColor}
              />
              {isOwner && (
                <View style={styles.ownerMarkerBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
              {isFavorite && !isOwner && (
                <View style={[styles.favoriteMarkerBadge, { backgroundColor: restaurant.type ? typeColor : "#FF6B35" }]}>
                  <Ionicons name="heart" size={10} color="#fff" />
                </View>
              )}
              {restaurant.type && (
                <View style={[styles.typeMarkerBadge, { backgroundColor: typeColor }]}>
                  <Text style={styles.typeMarkerText}>{restaurant.type.charAt(0)}</Text>
                </View>
              )}
            </View>
          </Marker>
        );
      });
  };

  if (loading || locationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>
          {locationLoading ? 'Getting your location...' : 'Loading restaurants...'}
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
              <Ionicons name="map-outline" size={20} color={showMap ? '#fff' : '#FF6B35'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !showMap && styles.activeToggle]}
              onPress={() => setShowMap(false)}
            >
              <Ionicons name="list-outline" size={20} color={!showMap ? '#fff' : '#FF6B35'} />
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
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants, cuisine, type, or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Restaurant Type Filter */}
      {renderTypeFilter()}

      {/* Restaurant Type Legend for Map View */}
      {showMap && selectedTypeFilter === 'All' && (
        <View style={styles.legendContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(RESTAURANT_TYPE_COLORS).map(([type, color]) => (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendColorDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{type}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {showMap ? (
        <MapView 
          style={styles.map} 
          region={mapRegion}
          // provider={PROVIDER_GOOGLE}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={true}
          onRegionChangeComplete={setMapRegion}
          onError={(error) => {
            console.error('MapView error:', error);
            Alert.alert('Map Error', 'There was an issue loading the map. Please try again.');
          }}
        >
          {renderMapMarkers()}
        </MapView>
      ) : (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurantCard}
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          style={styles.restaurantList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {selectedTypeFilter === 'All' 
                  ? 'No restaurants found' 
                  : `No ${selectedTypeFilter} restaurants found`
                }
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedTypeFilter === 'All' 
                  ? 'Be the first to add a restaurant!' 
                  : 'Try searching for a different type or add one yourself!'
                }
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#FF6B35',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
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
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  // Type Filter Styles
  typeFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedTypeFilterChip: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  typeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  typeFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginRight: 6,
  },
  selectedTypeFilterText: {
    color: '#fff',
  },
  typeFilterCount: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  typeFilterCountText: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  // Restaurant Type Legend Styles
  legendContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8f8f8',
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
    color: '#666',
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    position: 'relative',
  },
  ownedMarkerContainer: {
    borderColor: '#4CAF50',
  },
  ownerMarkerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  favoriteMarkerBadge: {
    position: 'absolute',
    top: -3,
    left: -3,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  typeMarkerBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  typeMarkerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  restaurantList: {
    flex: 1,
    padding: 15,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ownerBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  ownerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  restaurantTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#999',
  },
  address: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  distance: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  favoriteContainer: {
    padding: 12,
    justifyContent: 'flex-start',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#4CAF50',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});