// screens/MyRestaurantsScreen.js - Updated with restaurant types
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

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

export default function MyRestaurantsScreen({ navigation }) {
  const { user } = useAuth();
  const { restaurants, deleteRestaurant, updateRestaurant } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [myRestaurants, setMyRestaurants] = useState([]);

  useEffect(() => {
    if (user && restaurants) {
      const owned = restaurants.filter(restaurant => restaurant.ownerId === user.uid);
      setMyRestaurants(owned);
    }
  }, [user, restaurants]);

  const onRefresh = () => {
    setRefreshing(true);
    // The restaurants will automatically update through the real-time listener
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getRestaurantTypeColor = (type) => {
    return RESTAURANT_TYPE_COLORS[type] || '#FF6B35'; // Default orange color
  };

  const handleAddRestaurant = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to add a restaurant.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    navigation.navigate('AddRestaurant');
  };

  const handleEditRestaurant = (restaurant) => {
    navigation.navigate('EditRestaurant', { restaurant });
  };

  const handleManageMenu = (restaurant) => {
    navigation.navigate('ManageMenu', { restaurant });
  };

  const handleToggleStatus = async (restaurant, isActive) => {
    const result = await updateRestaurant(restaurant.id, { 
      isActive,
      updatedAt: new Date().toISOString()
    });
    
    if (result.success) {
      Alert.alert('Success', `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } else {
      Alert.alert('Error', 'Failed to update restaurant status.');
    }
  };

  const handleDeleteRestaurant = (restaurant) => {
    Alert.alert(
      'Delete Restaurant',
      `Are you sure you want to delete "${restaurant.name}"? This action cannot be undone and will remove all associated orders and reviews.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRestaurant(restaurant.id);
            if (result.success) {
              Alert.alert('Success', 'Restaurant deleted successfully!');
            } else {
              Alert.alert('Error', 'Failed to delete restaurant.');
            }
          }
        }
      ]
    );
  };

  const renderRestaurantCard = ({ item }) => {
    const menuItemsCount = item.menu?.length || 0;
    const isActive = item.isActive !== false; // Default to true if not set
    const typeColor = getRestaurantTypeColor(item.type);

    return (
      <View style={styles.restaurantCard}>
        <View style={styles.cardHeader}>
          <Image 
            source={{ uri: item.image || 'https://via.placeholder.com/80x80?text=Restaurant' }}
            style={styles.restaurantImage}
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{item.name}</Text>
            <View style={styles.restaurantTypeContainer}>
              <Text style={styles.restaurantCuisine}>{item.cuisine}</Text>
              {item.type && (
                <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                  <Text style={styles.typeBadgeText}>{item.type}</Text>
                </View>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.statText}>{item.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="restaurant" size={14} color="#666" />
                <Text style={styles.statText}>{menuItemsCount} items</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={14} color="#666" />
                <Text style={styles.statText}>{item.reviewCount || 0} reviews</Text>
              </View>
            </View>
            <Text style={styles.restaurantAddress}>{item.location.address}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={(value) => handleToggleStatus(item, value)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={isActive ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditRestaurant(item)}
          >
            <Ionicons name="create-outline" size={18} color="#2196F3" />
            <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.menuButton]}
            onPress={() => handleManageMenu(item)}
          >
            <Ionicons name="restaurant-outline" size={18} color="#FF6B35" />
            <Text style={[styles.actionButtonText, styles.menuButtonText]}>Menu ({menuItemsCount})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurant: item })}
          >
            <Ionicons name="eye-outline" size={18} color="#9C27B0" />
            <Text style={[styles.actionButtonText, styles.viewButtonText]}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteRestaurant(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="restaurant-outline" size={80} color="#ccc" />
        <Text style={styles.guestTitle}>My Restaurants</Text>
        <Text style={styles.guestSubtitle}>Please login to manage your restaurants</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Restaurants</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddRestaurant}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {myRestaurants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Restaurants Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start your food business by adding your first restaurant!
          </Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={handleAddRestaurant}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstButtonText}>Add Your First Restaurant</Text>
          </TouchableOpacity>
          
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Benefits of Adding Your Restaurant:</Text>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Reach more customers online</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Manage your menu easily</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Track orders and reviews</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.benefitText}>Free to get started</Text>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={myRestaurants}
          renderItem={renderRestaurantCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.restaurantsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 40,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  restaurantsList: {
    padding: 15,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  editButtonText: {
    color: '#2196F3',
  },
  menuButton: {
    backgroundColor: '#FFF3E0',
  },
  menuButtonText: {
    color: '#FF6B35',
  },
  viewButton: {
    backgroundColor: '#F3E5F5',
  },
  viewButtonText: {
    color: '#9C27B0',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: '#F44336',
  },
});