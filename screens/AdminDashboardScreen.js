// screens/AdminDashboardScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { restaurants, orders, updateOrderStatus, deleteRestaurant } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate dashboard stats
  const getDashboardStats = () => {
    const totalRestaurants = restaurants.length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    }).length;
    
    const totalRevenue = orders
      .filter(order => order.status === 'delivered')
      .reduce((sum, order) => sum + order.totalPrice, 0);

    return {
      totalRestaurants,
      totalOrders,
      pendingOrders,
      todayOrders,
      totalRevenue
    };
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } else {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleDeleteRestaurant = (restaurantId, restaurantName) => {
    Alert.alert(
      'Delete Restaurant',
      `Are you sure you want to delete "${restaurantName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRestaurant(restaurantId);
            if (result.success) {
              Alert.alert('Success', 'Restaurant deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete restaurant');
            }
          }
        }
      ]
    );
  };

  const renderStatCard = (title, value, icon, color = '#FF6B35') => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
      </View>
    </View>
  );

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderCustomer}>{item.userName}</Text>
        <Text style={styles.orderDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.orderRestaurant}>{item.restaurantName}</Text>
      <Text style={styles.orderTotal}>£. {item.totalPrice}</Text>
      
      <View style={styles.orderActions}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleOrderStatusUpdate(item.id, 'confirmed')}
            >
              <Text style={styles.actionButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleOrderStatusUpdate(item.id, 'cancelled')}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {item.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.prepareButton]}
            onPress={() => handleOrderStatusUpdate(item.id, 'preparing')}
          >
            <Text style={styles.actionButtonText}>Start Preparing</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'preparing' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dispatchButton]}
            onPress={() => handleOrderStatusUpdate(item.id, 'on_the_way')}
          >
            <Text style={styles.actionButtonText}>Dispatch</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'on_the_way' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deliveredButton]}
            onPress={() => handleOrderStatusUpdate(item.id, 'delivered')}
          >
            <Text style={styles.actionButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderRestaurantItem = ({ item }) => (
    <View style={styles.restaurantItem}>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantCuisine}>{item.cuisine}</Text>
        <Text style={styles.restaurantAddress}>{item.location.address}</Text>
        <View style={styles.restaurantStats}>
          <Text style={styles.restaurantRating}>
            ⭐ {item.rating?.toFixed(1) || '0.0'} ({item.reviewCount || 0})
          </Text>
          <Text style={styles.restaurantMenu}>
            📱 {item.menu?.length || 0} items
          </Text>
        </View>
      </View>
      
      <View style={styles.restaurantActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            // Navigate to edit restaurant screen
            Alert.alert('Feature', 'Edit restaurant feature coming soon!');
          }}
        >
          <Ionicons name="create-outline" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRestaurant(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'confirmed': return '#4CAF50';
      case 'preparing': return '#2196F3';
      case 'on_the_way': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'on_the_way': return 'On the Way';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="shield-outline" size={80} color="#ccc" />
        <Text style={styles.unauthorizedTitle}>Access Denied</Text>
        <Text style={styles.unauthorizedSubtitle}>
          You don't have permission to access the admin dashboard
        </Text>
      </View>
    );
  }

  const stats = getDashboardStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRestaurant')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'restaurants' && styles.activeTab]}
          onPress={() => setActiveTab('restaurants')}
        >
          <Text style={[styles.tabText, activeTab === 'restaurants' && styles.activeTabText]}>
            Restaurants
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && (
          <View style={styles.overviewTab}>
            <View style={styles.statsGrid}>
              {renderStatCard('Total Restaurants', stats.totalRestaurants, 'restaurant', '#4CAF50')}
              {renderStatCard('Total Orders', stats.totalOrders, 'receipt', '#2196F3')}
              {renderStatCard('Pending Orders', stats.pendingOrders, 'time', '#FFA500')}
              {renderStatCard('Today\'s Orders', stats.todayOrders, 'today', '#9C27B0')}
              {renderStatCard('Total Revenue', `£. ${stats.totalRevenue}`, 'cash', '#FF6B35')}
            </View>

            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('AddRestaurant')}
                >
                  <Ionicons name="add-circle" size={32} color="#4CAF50" />
                  <Text style={styles.quickActionText}>Add Restaurant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => setActiveTab('orders')}
                >
                  <Ionicons name="notifications" size={32} color="#FFA500" />
                  <Text style={styles.quickActionText}>Pending Orders</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'orders' && (
          <View style={styles.ordersTab}>
            <FlatList
              data={orders}
              renderItem={renderOrderItem}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="receipt-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No orders found</Text>
                </View>
              }
              scrollEnabled={false}
            />
          </View>
        )}

        {activeTab === 'restaurants' && (
          <View style={styles.restaurantsTab}>
            <FlatList
              data={restaurants}
              renderItem={renderRestaurantItem}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="restaurant-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No restaurants found</Text>
                  <TouchableOpacity
                    style={styles.addFirstButton}
                    onPress={() => navigation.navigate('AddRestaurant')}
                  >
                    <Text style={styles.addFirstButtonText}>Add First Restaurant</Text>
                  </TouchableOpacity>
                </View>
              }
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  overviewTab: {
    padding: 15,
  },
  statsGrid: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 15,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  ordersTab: {
    padding: 15,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  orderRestaurant: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 10,
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  prepareButton: {
    backgroundColor: '#2196F3',
  },
  dispatchButton: {
    backgroundColor: '#9C27B0',
  },
  deliveredButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  restaurantsTab: {
    padding: 15,
  },
  restaurantItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  restaurantStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restaurantRating: {
    fontSize: 12,
    color: '#333',
  },
  restaurantMenu: {
    fontSize: 12,
    color: '#333',
  },
  restaurantActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 8,
    marginRight: 10,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  addFirstButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});