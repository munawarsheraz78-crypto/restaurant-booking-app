// screens/ProfileScreen.js - Updated with calorie tracking
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUserProfile } = useAuth();
  const { restaurants, userOrders } = useData();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [calorieTimeframe, setCalorieTimeframe] = useState('daily'); // daily, weekly, monthly
  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleEditProfile = async () => {
    if (!editData.name.trim() || !editData.phone.trim() || !editData.address.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await updateUserProfile(editData);
    setLoading(false);

    if (result.success) {
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      Alert.alert('Feature Coming Soon', 'Profile picture upload will be available soon!');
    }
  };

  const getFavoriteRestaurants = () => {
    if (!user?.favoriteRestaurants || user.favoriteRestaurants.length === 0) {
      return [];
    }
    return restaurants.filter(restaurant => 
      user.favoriteRestaurants.includes(restaurant.id)
    );
  };

  const getProfileStats = () => {
    const favoriteCount = user?.favoriteRestaurants?.length || 0;
    const orderCount = user?.orderHistory?.length || 0;
    return { favoriteCount, orderCount };
  };

  // Calculate calories consumed based on timeframe
  const calculateCalories = (timeframe) => {
    if (!userOrders || userOrders.length === 0) return 0;

    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const filteredOrders = userOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && order.status === 'delivered';
    });

    let totalCalories = 0;
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const calories = item.calories || 0;
          const quantity = item.quantity || 1;
          totalCalories += calories * quantity;
        });
      }
    });

    return totalCalories;
  };

  // Get calorie statistics for the last 7 days for chart
  const getCalorieHistory = () => {
    const history = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const dayOrders = userOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= date && orderDate < nextDate && order.status === 'delivered';
      });
      
      let dayCalories = 0;
      dayOrders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            const calories = item.calories || 0;
            const quantity = item.quantity || 1;
            dayCalories += calories * quantity;
          });
        }
      });
      
      history.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        calories: dayCalories
      });
    }
    
    return history;
  };

  const dailyCalories = calculateCalories('daily');
  const weeklyCalories = calculateCalories('weekly');
  const monthlyCalories = calculateCalories('monthly');
  const calorieHistory = getCalorieHistory();

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="person-circle-outline" size={120} color="#ccc" />
        <Text style={styles.guestTitle}>Welcome to FoodieApp</Text>
        <Text style={styles.guestSubtitle}>Please sign in to access your profile</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { favoriteCount, orderCount } = getProfileStats();
  const favoriteRestaurants = getFavoriteRestaurants();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowEditModal(true)}
        >
          <Ionicons name="create-outline" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.userRole}>{user.role === 'admin' ? 'Administrator' : 'Customer'}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{favoriteCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => setShowCalorieModal(true)}
          >
            <Text style={styles.statNumber}>{dailyCalories}</Text>
            <Text style={styles.statLabel}>Cal Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calorie Tracking Section */}
      <View style={styles.calorieSection}>
        <View style={styles.calorieSectionHeader}>
          <Text style={styles.sectionTitle}>Calorie Tracking</Text>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => setShowCalorieModal(true)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.calorieCards}>
          <View style={styles.calorieCard}>
            <View style={styles.calorieCardHeader}>
              <Ionicons name="flame" size={20} color="#FF6B35" />
              <Text style={styles.calorieCardTitle}>Today</Text>
            </View>
            <Text style={styles.calorieCardValue}>{dailyCalories}</Text>
            <Text style={styles.calorieCardLabel}>calories</Text>
          </View>
          
          <View style={styles.calorieCard}>
            <View style={styles.calorieCardHeader}>
              <Ionicons name="calendar" size={20} color="#4CAF50" />
              <Text style={styles.calorieCardTitle}>This Week</Text>
            </View>
            <Text style={styles.calorieCardValue}>{weeklyCalories}</Text>
            <Text style={styles.calorieCardLabel}>calories</Text>
          </View>
          
          <View style={styles.calorieCard}>
            <View style={styles.calorieCardHeader}>
              <Ionicons name="stats-chart" size={20} color="#2196F3" />
              <Text style={styles.calorieCardTitle}>This Month</Text>
            </View>
            <Text style={styles.calorieCardValue}>{monthlyCalories}</Text>
            <Text style={styles.calorieCardLabel}>calories</Text>
          </View>
        </View>

        {/* Simple 7-day calorie chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Last 7 Days</Text>
          <View style={styles.chartBars}>
            {calorieHistory.map((day, index) => {
              const maxCalories = Math.max(...calorieHistory.map(d => d.calories), 1);
              const height = Math.max((day.calories / maxCalories) * 80, 2);
              
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={[styles.chartBar, { height }]} />
                  <Text style={styles.chartBarLabel}>{day.date}</Text>
                  <Text style={styles.chartBarValue}>{day.calories}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('UserOrderHistory')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="receipt-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>My Order History</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.menuItemCount}>{userOrders.length}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="location-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Delivery Addresses</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="card-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Payment Methods</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {favoriteRestaurants.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>Favorite Restaurants</Text>
          {favoriteRestaurants.slice(0, 3).map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.favoriteItem}
              onPress={() => navigation.navigate('RestaurantDetail', { restaurant })}
            >
              <Image source={{ uri: restaurant.image }} style={styles.favoriteImage} />
              <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName}>{restaurant.name}</Text>
                <Text style={styles.favoriteCuisine}>{restaurant.cuisine}</Text>
                <View style={styles.favoriteRating}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{restaurant.rating?.toFixed(1) || '0.0'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B35" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={editData.name}
                onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={editData.phone}
                onChangeText={(text) => setEditData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Address"
                value={editData.address}
                onChangeText={(text) => setEditData(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleEditProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calorie Details Modal */}
      <Modal
        visible={showCalorieModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalorieModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calorieModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calorie Tracking</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalorieModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.timeframeSelector}>
                {['daily', 'weekly', 'monthly'].map((timeframe) => (
                  <TouchableOpacity
                    key={timeframe}
                    style={[
                      styles.timeframeButton,
                      calorieTimeframe === timeframe && styles.activeTimeframeButton
                    ]}
                    onPress={() => setCalorieTimeframe(timeframe)}
                  >
                    <Text style={[
                      styles.timeframeButtonText,
                      calorieTimeframe === timeframe && styles.activeTimeframeButtonText
                    ]}>
                      {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.calorieDetailCard}>
                <View style={styles.calorieDetailHeader}>
                  <Ionicons name="flame" size={32} color="#FF6B35" />
                  <View style={styles.calorieDetailInfo}>
                    <Text style={styles.calorieDetailValue}>
                      {calculateCalories(calorieTimeframe)}
                    </Text>
                    <Text style={styles.calorieDetailLabel}>
                      Calories {calorieTimeframe === 'daily' ? 'today' : `this ${calorieTimeframe.slice(0, -2)}`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.calorieBreakdownSection}>
                <Text style={styles.breakdownTitle}>Calorie Sources</Text>
                {userOrders
                  .filter(order => {
                    const orderDate = new Date(order.createdAt);
                    const now = new Date();
                    let startDate;

                    switch (calorieTimeframe) {
                      case 'daily':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                      case 'weekly':
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - now.getDay());
                        startOfWeek.setHours(0, 0, 0, 0);
                        startDate = startOfWeek;
                        break;
                      case 'monthly':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                      default:
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    }

                    return orderDate >= startDate && order.status === 'delivered';
                  })
                  .slice(0, 5) // Show last 5 relevant orders
                  .map((order) => (
                    <View key={order.id} style={styles.calorieBreakdownItem}>
                      <View style={styles.breakdownItemHeader}>
                        <Text style={styles.breakdownRestaurant}>{order.restaurantName}</Text>
                        <Text style={styles.breakdownDate}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {order.items.map((item, index) => {
                        const itemCalories = (item.calories || 0) * (item.quantity || 1);
                        return (
                          <View key={index} style={styles.breakdownFoodItem}>
                            <Text style={styles.breakdownFoodName}>{item.name}</Text>
                            <View style={styles.breakdownFoodStats}>
                              <Text style={styles.breakdownQuantity}>x{item.quantity}</Text>
                              <View style={styles.breakdownCalories}>
                                <Ionicons name="flame-outline" size={12} color="#FF6B35" />
                                <Text style={styles.breakdownCaloriesText}>{itemCalories} cal</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                
                {userOrders.filter(order => {
                  const orderDate = new Date(order.createdAt);
                  const now = new Date();
                  let startDate;

                  switch (calorieTimeframe) {
                    case 'daily':
                      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      break;
                    case 'weekly':
                      const startOfWeek = new Date(now);
                      startOfWeek.setDate(now.getDate() - now.getDay());
                      startOfWeek.setHours(0, 0, 0, 0);
                      startDate = startOfWeek;
                      break;
                    case 'monthly':
                      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                      break;
                    default:
                      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  }

                  return orderDate >= startDate && order.status === 'delivered';
                }).length === 0 && (
                  <View style={styles.noDataContainer}>
                    <Ionicons name="restaurant-outline" size={48} color="#ccc" />
                    <Text style={styles.noDataText}>No orders found</Text>
                    <Text style={styles.noDataSubtext}>
                      Start ordering to track your calories
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupButton: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  signupButtonText: {
    color: '#FF6B35',
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    padding: 5,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  // Calorie Tracking Styles
  calorieSection: {
    backgroundColor: '#fff',
    marginTop: 15,
    padding: 20,
  },
  calorieSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginRight: 4,
  },
  calorieCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calorieCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  calorieCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calorieCardTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  calorieCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  calorieCardLabel: {
    fontSize: 10,
    color: '#999',
  },
  chartContainer: {
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 10,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    backgroundColor: '#FF6B35',
    width: 20,
    borderRadius: 2,
    marginBottom: 5,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  chartBarValue: {
    fontSize: 9,
    color: '#999',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemCount: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: 'bold',
    marginRight: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  favoritesSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  favoriteItem: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  favoriteImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  favoriteInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favoriteCuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  favoriteRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  logoutSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B35',
    marginLeft: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  calorieModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Calorie Modal Styles
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTimeframeButton: {
    backgroundColor: '#FF6B35',
  },
  timeframeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTimeframeButtonText: {
    color: '#fff',
  },
  calorieDetailCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  calorieDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calorieDetailInfo: {
    marginLeft: 15,
  },
  calorieDetailValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  calorieDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  calorieBreakdownSection: {
    marginTop: 10,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  calorieBreakdownItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownRestaurant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  breakdownDate: {
    fontSize: 12,
    color: '#666',
  },
  breakdownFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownFoodName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  breakdownFoodStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownQuantity: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  breakdownCalories: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  breakdownCaloriesText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 2,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
}); 