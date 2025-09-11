// screens/EditRestaurantScreen.js - Updated with WebView map and restaurant types
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getAllRestaurantTypes, getRestaurantTypeColor, getComplementaryColor } from '../utils/restaurantTypes';

const { width, height } = Dimensions.get('window');

export default function EditRestaurantScreen({ route, navigation }) {
  const { restaurant } = route.params;
  const { user } = useAuth();
  const { updateRestaurant, uploadImage } = useData();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUri, setImageUri] = useState(restaurant.image || null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const webViewRef = useRef(null);
  const [formData, setFormData] = useState({
    name: restaurant.name || '',
    cuisine: restaurant.cuisine || '',
    type: restaurant.type || '', // Added restaurant type
    description: restaurant.description || '',
    phone: restaurant.phone || '',
    email: restaurant.email || '',
    address: restaurant.location?.address || '',
    latitude: restaurant.location?.latitude || null,
    longitude: restaurant.location?.longitude || null
  });

  const cuisineTypes = [
    'Pakistani', 'Indian', 'Chinese', 'Italian', 'American', 
    'Thai', 'Mexican', 'Japanese', 'Mediterranean', 'Fast Food',
    'BBQ', 'Seafood', 'Continental', 'Desi', 'Karahi'
  ];

  // Get restaurant types from utility
  const restaurantTypes = getAllRestaurantTypes();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
const mapPickerInstructionsText = () => {
  if (formData.latitude && formData.longitude) {
    return "Orange pin shows your restaurant's current location. Blue pin (if visible) shows your current location.";
  } else {
    return "No saved location found. Orange pin shows suggested location. Blue pin (if visible) shows your current location.";
  }
};
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to update restaurant image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant location permissions to update location.');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      const { latitude, longitude } = location.coords;

      // Validate coordinates
      if (!latitude || !longitude || 
          latitude < -90 || latitude > 90 || 
          longitude < -180 || longitude > 180) {
        throw new Error('Invalid coordinates received');
      }

      // Get address from coordinates
      try {
        const addressResult = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });

        if (addressResult.length > 0) {
          const addr = addressResult[0];
          const fullAddress = [
            addr.streetNumber,
            addr.street, 
            addr.city,
            addr.region,
            addr.country
          ].filter(Boolean).join(', ');
          
          setFormData(prev => ({
            ...prev,
            address: fullAddress || prev.address,
            latitude: parseFloat(latitude.toFixed(6)),
            longitude: parseFloat(longitude.toFixed(6))
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(latitude.toFixed(6)),
            longitude: parseFloat(longitude.toFixed(6))
          }));
        }
      } catch (geocodingError) {
        console.warn('Reverse geocoding failed:', geocodingError);
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6))
        }));
      }
      
      Alert.alert('Success', 'Location updated successfully!');
      
    } catch (error) {
      console.error('Location error:', error);
      let errorMessage = 'Failed to get location. Please try again.';
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location services unavailable. Please enable GPS.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  // Function to open map picker - prioritize current location
const openMapPicker = async (lat, lng) => {
  let initialLocation = { latitude: 33.6844, longitude: 73.0479 }; // Fallback

  // First priority: Use restaurant's existing coordinates if available
  if (lat && lng && lat !== 0 && lng !== 0) {
    initialLocation = { latitude: lat, longitude: lng };
    console.log('Using restaurant location for map picker:', initialLocation);
  } else {
    // Second priority: Try to get current location only if restaurant has no location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
        
        if (location?.coords?.latitude && location?.coords?.longitude) {
          initialLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };
          console.log('Restaurant has no location, using current location for map picker:', initialLocation);
        }
      }
    } catch (error) {
      console.log('Could not get current location, using fallback coordinates');
    }
  }

  setTempLocation(initialLocation);
  setShowMapPicker(true);
};
  // Generate map HTML for location picker
 const generateMapPickerHTML = () => {
  // Use restaurant location if available, otherwise use tempLocation or fallback
  const centerLat = formData.latitude || tempLocation?.latitude || 33.6844;
  const centerLng = formData.longitude || tempLocation?.longitude || 73.0479;

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
          .location-marker {
            background: #FF6B35;
            border: 3px solid white;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: move;
          }
          .user-location-marker {
            background: #2196F3;
            border: 2px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .my-location-button {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 20px;
            transition: all 0.2s ease;
          }
          .my-location-button:hover {
            background: #f5f5f5;
            border-color: #2196F3;
          }
          .my-location-button:active {
            background: #2196F3;
            color: white;
          }
          .info-popup {
            padding: 10px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 200px;
          }
          .coordinates {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="my-location-button" id="myLocationBtn" title="Go to my current location">
          🎯
        </div>
        <script>
          let map;
          let marker;
          let userLocationMarker;
          let currentPosition = [${centerLat}, ${centerLng}];
          let userLocation = null;
          const hasRestaurantLocation = ${!!(formData.latitude && formData.longitude)};

          function initMap() {
            map = L.map('map').setView(currentPosition, 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Create draggable restaurant location marker first
            updateRestaurantMarker(currentPosition);

            // Try to get user's current location for reference (but don't change restaurant marker)
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                function(position) {
                  userLocation = [position.coords.latitude, position.coords.longitude];
                  addUserLocationMarker(userLocation);
                  
                  // Only center on user location if restaurant has no saved location
                  if (!hasRestaurantLocation) {
                    console.log('No restaurant location, centering on user location');
                    currentPosition = userLocation;
                    map.setView(currentPosition, 15);
                    updateRestaurantMarker(currentPosition);
                    notifyPositionChange(currentPosition[0], currentPosition[1]);
                  } else {
                    console.log('Restaurant location exists, keeping restaurant marker at saved location');
                  }
                },
                function(error) {
                  console.log('Could not get user location:', error);
                },
                { timeout: 10000, enableHighAccuracy: true }
              );
            }

            // Add click handler to map
            map.on('click', function(e) {
              const newPos = [e.latlng.lat, e.latlng.lng];
              currentPosition = newPos;
              updateRestaurantMarker(newPos);
              notifyPositionChange(e.latlng.lat, e.latlng.lng);
            });

            // Add my location button handler
            document.getElementById('myLocationBtn').addEventListener('click', goToMyLocation);

            // Notify React Native that map is ready
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapReady'
              }));
            }
          }

          function addUserLocationMarker(position) {
            if (userLocationMarker) {
              map.removeLayer(userLocationMarker);
            }

            const userLocationIcon = L.divIcon({
              className: 'user-location-marker',
              html: '📍',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });

            userLocationMarker = L.marker(position, { icon: userLocationIcon });
            userLocationMarker.bindPopup('Your current location');
            userLocationMarker.addTo(map);
          }

          function updateRestaurantMarker(position) {
            if (marker) {
              map.removeLayer(marker);
            }

            const markerIcon = L.divIcon({
              className: 'location-marker',
              html: '🏪',
              iconSize: [25, 25],
              iconAnchor: [12, 12]
            });

            marker = L.marker(position, { 
              icon: markerIcon,
              draggable: true 
            });
            
            const statusText = hasRestaurantLocation ? 'Current Restaurant Location' : 'New Restaurant Location';
            marker.bindPopup(\`
              <div class="info-popup">
                <strong>\${statusText}</strong>
                <div class="coordinates">
                  Lat: \${position[0].toFixed(6)}<br/>
                  Lng: \${position[1].toFixed(6)}
                </div>
              </div>
            \`);

            marker.on('dragend', function(e) {
              const newPos = e.target.getLatLng();
              currentPosition = [newPos.lat, newPos.lng];
              notifyPositionChange(newPos.lat, newPos.lng);
              
              marker.setPopupContent(\`
                <div class="info-popup">
                  <strong>Updated Restaurant Location</strong>
                  <div class="coordinates">
                    Lat: \${newPos.lat.toFixed(6)}<br/>
                    Lng: \${newPos.lng.toFixed(6)}
                  </div>
                </div>
              \`);
            });

            marker.addTo(map);
          }

          function goToMyLocation() {
            if (!navigator.geolocation) {
              alert('Location services are not supported by this browser. Please use a modern browser with location support.');
              return;
            }

            const btn = document.getElementById('myLocationBtn');
            btn.style.background = '#2196F3';
            btn.style.color = 'white';
            
            navigator.geolocation.getCurrentPosition(
              function(position) {
                const newUserLocation = [position.coords.latitude, position.coords.longitude];
                userLocation = newUserLocation;
                
                // Update or add user location marker
                addUserLocationMarker(newUserLocation);
                
                // Center map on user location (but don't move restaurant marker)
                map.setView(newUserLocation, 16);
                
                // Reset button style
                setTimeout(() => {
                  btn.style.background = 'white';
                  btn.style.color = 'black';
                }, 500);
              },
              function(error) {
                console.error('Error getting location:', error);
                let message = '';
                
                switch(error.code) {
                  case error.PERMISSION_DENIED:
                    message = 'Location access was denied. Please enable location permissions in your browser settings and try again.\\n\\nTo enable:\\n• Click the location icon in your browser\\'s address bar\\n• Select "Always allow location access"\\n• Refresh the page';
                    break;
                  case error.POSITION_UNAVAILABLE:
                    message = 'Location information is unavailable. Please check that location services are enabled on your device and try again.';
                    break;
                  case error.TIMEOUT:
                    message = 'Location request timed out. Please ensure you have a good GPS signal and try again.';
                    break;
                  default:
                    message = 'An unknown error occurred while getting your location. Please check your location settings and try again.';
                    break;
                }
                
                alert(message);
                
                // Reset button style
                btn.style.background = 'white';
                btn.style.color = 'black';
              },
              { 
                timeout: 15000, 
                enableHighAccuracy: true, 
                maximumAge: 60000 
              }
            );
          }

          function notifyPositionChange(lat, lng) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationUpdate',
                latitude: lat,
                longitude: lng
              }));
            }
          }

          function setMapCenter(lat, lng) {
            const newPos = [lat, lng];
            currentPosition = newPos;
            map.setView(newPos, 15);
            updateRestaurantMarker(newPos);
          }

          // Handle messages from React Native
          document.addEventListener('message', function(event) {
            try {
              const message = JSON.parse(event.data);
              if (message.type === 'setCenter') {
                setMapCenter(message.latitude, message.longitude);
              }
            } catch (error) {
              console.error('Error handling message:', error);
            }
          });

          // For Android
          window.addEventListener('message', function(event) {
            try {
              const message = JSON.parse(event.data);
              if (message.type === 'setCenter') {
                setMapCenter(message.latitude, message.longitude);
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

const handleMapMessage = (event) => {
  try {
    const message = JSON.parse(event.nativeEvent.data);
    
    if (message.type === 'locationUpdate') {
      setTempLocation({
        latitude: message.latitude,
        longitude: message.longitude
      });
    } else if (message.type === 'mapReady') {
      console.log('Map picker ready');
      // Ensure we have the restaurant location in tempLocation
      if (!tempLocation && formData.latitude && formData.longitude) {
        setTempLocation({
          latitude: formData.latitude,
          longitude: formData.longitude
        });
      }
      
      if (tempLocation && webViewRef.current) {
        const centerMessage = JSON.stringify({
          type: 'setCenter',
          latitude: tempLocation.latitude,
          longitude: tempLocation.longitude
        });
        webViewRef.current.postMessage(centerMessage);
      }
    }
  } catch (error) {
    console.error('Error handling map message:', error);
  }
};

  // Handle map picker selection
  const handleMapPickerSelect = async () => {
    if (!tempLocation) return;

    try {
      // Get address for the selected location
      const addressResult = await Location.reverseGeocodeAsync(tempLocation);

      let address = formData.address;
      if (addressResult.length > 0) {
        const addr = addressResult[0];
        const fullAddress = [
          addr.streetNumber,
          addr.street, 
          addr.city,
          addr.region,
          addr.country
        ].filter(Boolean).join(', ');
        address = fullAddress || address;
      }

      setFormData(prev => ({
        ...prev,
        address,
        latitude: parseFloat(tempLocation.latitude.toFixed(6)),
        longitude: parseFloat(tempLocation.longitude.toFixed(6))
      }));

      setShowMapPicker(false);
      Alert.alert('Success', 'Location updated successfully!');
    } catch (error) {
      console.error('Error getting address for selected location:', error);
      // Still use the coordinates even if address lookup fails
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(tempLocation.latitude.toFixed(6)),
        longitude: parseFloat(tempLocation.longitude.toFixed(6))
      }));

      setShowMapPicker(false);
      Alert.alert('Success', 'Location updated successfully!');
    }
  };

  const validateForm = () => {
    const { name, cuisine, type, description, phone, email, address, latitude, longitude } = formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter restaurant name');
      return false;
    }

    if (!cuisine.trim()) {
      Alert.alert('Error', 'Please select cuisine type');
      return false;
    }

    if (!type.trim()) {
      Alert.alert('Error', 'Please select restaurant type');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter restaurant description');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Please enter restaurant address');
      return false;
    }

    if (!latitude || !longitude || 
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      Alert.alert('Error', 'Please set a valid restaurant location');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      let updateData = {
        name: formData.name.trim(),
        cuisine: formData.cuisine,
        type: formData.type, // Include restaurant type
        description: formData.description.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        location: {
          address: formData.address.trim(),
          latitude: formData.latitude,
          longitude: formData.longitude
        }
      };

      // Upload new image if selected
      if (imageUri && imageUri !== restaurant.image) {
        const imagePath = `restaurants/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const imageUrl = await uploadImage(imageUri, imagePath);
        updateData.image = imageUrl;
      }

      const result = await updateRestaurant(restaurant.id, updateData);

      if (result.success) {
        Alert.alert('Success', 'Restaurant updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(result.error || 'Failed to update restaurant');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', error.message || 'Failed to update restaurant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (restaurant.ownerId !== user.uid && user.role !== 'admin')) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="shield-outline" size={80} color="#ccc" />
        <Text style={styles.unauthorizedTitle}>Access Denied</Text>
        <Text style={styles.unauthorizedSubtitle}>
          You can only edit restaurants you own
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Edit Restaurant</Text>
          <Text style={styles.headerSubtitle}>{restaurant.name}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant Image</Text>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.selectedImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color="#ccc" />
                <Text style={styles.imagePlaceholderText}>Tap to update image</Text>
              </View>
            )}
            <View style={styles.imageOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.imageOverlayText}>Change Photo</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="restaurant-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Restaurant Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="fast-food-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Cuisine Type"
              value={formData.cuisine}
              onChangeText={(value) => handleInputChange('cuisine', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Restaurant Description"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Restaurant Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant Type</Text>
          <Text style={styles.sectionSubtitle}>Choose the type that best describes your restaurant</Text>
          <View style={styles.typeGrid}>
            {restaurantTypes.map((type) => {
              const textColor = getComplementaryColor(type.name);
              return (
                <TouchableOpacity
                  key={type.name}
                  style={[
                    styles.typeChip,
                    formData.type === type.name && { 
                      ...styles.selectedTypeChip, 
                      backgroundColor: type.color 
                    }
                  ]}
                  onPress={() => handleInputChange('type', type.name)}
                >
                  <View style={[styles.typeColorIndicator, { backgroundColor: type.color }]} />
                  <Text style={[
                    styles.typeChipText,
                    formData.type === type.name && { 
                      ...styles.selectedTypeChipText, 
                      color: textColor 
                    }
                  ]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Complete Address"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.locationButtons}>
            <TouchableOpacity
              style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="#fff" style={styles.locationIcon} />
                  <Text style={styles.locationButtonText}>Update Location</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => {
                setLocationLoading(true);
                openMapPicker(formData.latitude, formData.longitude).finally(() => {
                  setLocationLoading(false);
                });
              }}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <>
                  <Ionicons name="map" size={20} color="#2196F3" style={styles.locationIcon} />
                  <Text style={styles.mapButtonText}>Pick on Map</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {formData.latitude && formData.longitude && (
            <View style={styles.coordinatesContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.coordinatesText}>
                Location: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        {/* Cuisine Type Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuisine Types</Text>
          <View style={styles.cuisineGrid}>
            {cuisineTypes.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.cuisineChip,
                  formData.cuisine === cuisine && styles.selectedCuisineChip
                ]}
                onPress={() => handleInputChange('cuisine', cuisine)}
              >
                <Text style={[
                  styles.cuisineChipText,
                  formData.cuisine === cuisine && styles.selectedCuisineChipText
                ]}>
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Update Restaurant</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Map Picker Modal with WebView */}
      <Modal
        visible={showMapPicker}
        animationType="slide"
        onRequestClose={() => setShowMapPicker(false)}
      >
        <View style={styles.mapPickerContainer}>
          <View style={styles.mapPickerHeader}>
            <TouchableOpacity
              style={styles.mapPickerCancelButton}
              onPress={() => setShowMapPicker(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.mapPickerHeaderTitle}>Update Location</Text>
            <TouchableOpacity
              style={styles.mapPickerConfirmButton}
              onPress={handleMapPickerSelect}
            >
              <Ionicons name="checkmark" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          <WebView
            ref={webViewRef}
            source={{ html: generateMapPickerHTML() }}
            style={styles.mapPickerMap}
            onMessage={handleMapMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
              Alert.alert('Map Error', 'There was an issue loading the map. Please try again.');
            }}
            onLoadEnd={() => {
              console.log('Map picker WebView loaded');
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

          <View style={styles.mapPickerInstructions}>
  <Text style={styles.mapPickerInstructionsText}>
    {mapPickerInstructionsText()}
  </Text>
  <Text style={styles.mapPickerInstructionsSubtext}>
    Drag the orange marker or tap anywhere to set the precise location
  </Text>
  {tempLocation && (
    <Text style={styles.mapPickerCoordinatesText}>
      📍 {tempLocation.latitude.toFixed(6)}, {tempLocation.longitude.toFixed(6)}
    </Text>
  )}
</View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  unauthorizedSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  headerBackButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedImage: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 10,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Restaurant Type Styles
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedTypeChip: {
    borderColor: 'transparent',
  },
  typeColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  typeChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedTypeChipText: {
    fontWeight: 'bold',
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  mapButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cuisineChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCuisineChip: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  cuisineChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCuisineChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  // Map Picker Styles
  mapPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mapPickerCancelButton: {
    padding: 5,
  },
  mapPickerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mapPickerConfirmButton: {
    padding: 5,
  },
  mapPickerMap: {
    flex: 1,
  },
  mapPickerInstructions: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  mapPickerInstructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  mapPickerInstructionsSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  mapPickerCoordinatesText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
});