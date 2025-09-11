// screens/RestaurantOrdersScreen.js - For restaurant owners to manage incoming orders
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function RestaurantOrdersScreen({ navigation }) {
  const { user } = useAuth();
  const { restaurants, orders, updateOrderStatus } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [restaurantOrders, setRestaurantOrders] = useState([]);

  // Get user's restaurants
  const userRestaurants = restaurants.filter(restaurant => restaurant.ownerId === user?.uid);

  useEffect(() => {
    if (user && userRestaurants.length > 0) {
      // Filter orders for user's restaurants
      const userRestaurantIds = userRestaurants.map(r => r.id);
      const filteredOrders = orders.filter(order => 
        userRestaurantIds.includes(order.restaurantId)
      );

      // Further filter by selected restaurant if not 'all'
      const finalOrders = selectedRestaurant === 'all' 
        ? filteredOrders 
        : filteredOrders.filter(order => order.restaurantId === selectedRestaurant);

      setRestaurantOrders(finalOrders);
    }
  }, [user, orders, restaurants, selectedRestaurant]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

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

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'preparing';
      case 'preparing': return 'on_the_way';
      case 'on_the_way': return 'delivered';
      default: return null;
    }
  };

  const getStatusActionText = (status) => {
    switch (status) {
      case 'pending': return 'Accept Order';
      case 'confirmed': return 'Start Preparing';
      case 'preparing': return 'Mark as On the Way';
      case 'on_the_way': return 'Mark as Delivered';
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      Alert.alert('Success', `Order status updated to ${getStatusText(newStatus)}`);
    } else {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const renderRestaurantFilter = () => {
    if (userRestaurants.length <= 1) return null;

    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedRestaurant === 'all' && styles.selectedFilterChip
            ]}
            onPress={() => setSelectedRestaurant('all')}
          >
            <Text style={[
              styles.filterChipText,
              selectedRestaurant === 'all' && styles.selectedFilterChipText
            ]}>
              All Restaurants
            </Text>
          </TouchableOpacity>
          {userRestaurants.map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              style={[
                styles.filterChip,
                selectedRestaurant === restaurant.id && styles.selectedFilterChip
              ]}
              onPress={() => setSelectedRestaurant(restaurant.id)}
            >
              <Text style={[
                styles.filterChipText,
                selectedRestaurant === restaurant.id && styles.selectedFilterChipText
              ]}>
                {restaurant.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderOrderItem = ({ item }) => {
    const totalItems = item.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
    const totalCalories = item.totalCalories || item.items.reduce((sum, orderItem) => 
      sum + ((orderItem.calories || 0) * orderItem.quantity), 0
    );
    const nextStatus = getNextStatus(item.status);
    const actionText = getStatusActionText(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.customerName}>{item.userName}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetailRow}>
            <Text style={styles.itemsText}>{totalItems} items</Text>
            <Text style={styles.totalPrice}>£. {item.totalPrice}</Text>
          </View>
          {totalCalories > 0 && (
            <View style={styles.calorieRow}>
              <View style={styles.calorieInfo}>
                <Ionicons name="flame" size={14} color="#FF6B35" />
                <Text style={styles.calorieText}>{totalCalories} calories</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {nextStatus && actionText && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleStatusUpdate(item.id, nextStatus)}
            >
              <Text style={styles.actionButtonText}>{actionText}</Text>
            </TouchableOpacity>
          )}

          {item.status === 'pending' && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                Alert.alert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order?',
                  [
                    { text: 'No', style: 'cancel' },
                    { 
                      text: 'Yes, Cancel', 
                      style: 'destructive',
                      onPress: () => handleStatusUpdate(item.id, 'cancelled')
                    }
                  ]
                );
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderModalContent = () => {
    if (!selectedOrder) return null;

    const totalCalories = selectedOrder.totalCalories || selectedOrder.items.reduce((sum, item) => 
      sum + ((item.calories || 0) * item.quantity), 0
    );
    const nextStatus = getNextStatus(selectedOrder.status);
    const actionText = getStatusActionText(selectedOrder.status);

    return (
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Order Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowOrderModal(false)}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.orderDetailHeader}>
            <View style={styles.customerSection}>
              <Ionicons name="person-circle" size={50} color="#FF6B35" />
              <View style={styles.customerInfo}>
                <Text style={styles.customerNameModal}>{selectedOrder.userName}</Text>
                <Text style={styles.customerEmail}>{selectedOrder.userEmail}</Text>
                <Text style={styles.orderIdText}>Order #{selectedOrder.id.slice(-6)}</Text>
                <Text style={styles.orderDateModal}>{formatDate(selectedOrder.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.statusSection}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
              </View>
              {totalCalories > 0 && (
                <View style={styles.calorieInfoModal}>
                  <Ionicons name="flame" size={16} color="#FF6B35" />
                  <Text style={styles.calorieTextModal}>{totalCalories} calories total</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items Ordered</Text>
            {selectedOrder.items.map((item, index) => {
              const itemCalories = (item.calories || 0) * item.quantity;
              return (
                <View key={index} style={styles.orderItemRow}>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  )}
                  <View style={styles.itemNameContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    {item.calories && (
                      <View style={styles.itemCalorieContainer}>
                        <Ionicons name="flame-outline" size={12} color="#FF6B35" />
                        <Text style={styles.itemCalorieText}>
                          {item.calories} cal each • {itemCalories} cal total
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.itemQuantityPrice}>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>£. {item.price * item.quantity}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>£. {selectedOrder.totalPrice}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery Fee</Text>
              <Text style={styles.totalValue}>£. 50</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>£. {selectedOrder.totalPrice + 50}</Text>
            </View>
          </View>

          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.addressText}>{selectedOrder.deliveryAddress}</Text>
          </View>

          {nextStatus && actionText && (
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalActionButton}
                onPress={() => {
                  handleStatusUpdate(selectedOrder.id, nextStatus);
                  setShowOrderModal(false);
                }}
              >
                <Text style={styles.modalActionButtonText}>{actionText}</Text>
              </TouchableOpacity>
              
              {selectedOrder.status === 'pending' && (
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Order',
                      'Are you sure you want to cancel this order?',
                      [
                        { text: 'No', style: 'cancel' },
                        { 
                          text: 'Yes, Cancel', 
                          style: 'destructive',
                          onPress: () => {
                            handleStatusUpdate(selectedOrder.id, 'cancelled');
                            setShowOrderModal(false);
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="restaurant-outline" size={80} color="#ccc" />
        <Text style={styles.guestTitle}>Restaurant Orders</Text>
        <Text style={styles.guestSubtitle}>Please sign in to manage restaurant orders</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (userRestaurants.length === 0) {
    return (
      <View style={styles.noRestaurantsContainer}>
        <Ionicons name="storefront-outline" size={80} color="#ccc" />
        <Text style={styles.noRestaurantsTitle}>No Restaurants Found</Text>
        <Text style={styles.noRestaurantsSubtitle}>
          You need to add a restaurant first to manage orders
        </Text>
        <TouchableOpacity
          style={styles.addRestaurantButton}
          onPress={() => navigation.navigate('AddRestaurant')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addRestaurantButtonText}>Add Restaurant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Restaurant Orders</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>
            {restaurantOrders.length} orders
          </Text>
        </View>
      </View>

      {renderRestaurantFilter()}

      {restaurantOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            {selectedRestaurant === 'all' 
              ? 'Orders will appear here when customers place them'
              : 'No orders for the selected restaurant'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={restaurantOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Order Details Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          {renderOrderModalContent()}
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
  noRestaurantsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  noRestaurantsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  noRestaurantsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  addRestaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
  },
  addRestaurantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  headerStats: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedFilterChip: {
    backgroundColor: '#FF6B35',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  selectedFilterChipText: {
    color: '#fff',
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
  },
  ordersList: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  orderid: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderDetails: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsText: {
    fontSize: 14,
    color: '#666',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  calorieRow: {
    marginTop: 8,
  },
  calorieInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  calorieText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 4,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FF6B35',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  viewButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 100,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  orderDetailHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  customerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  customerNameModal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderIdText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  orderDateModal: {
    fontSize: 14,
    color: '#666',
  },
  statusSection: {
    alignItems: 'flex-start',
  },
  calorieInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calorieTextModal: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 4,
  },
  itemsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemCategory: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemCalorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemCalorieText: {
    fontSize: 11,
    color: '#FF6B35',
    marginLeft: 2,
  },
  itemQuantityPrice: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  deliverySection: {
    padding: 20,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalActions: {
    padding: 20,
    flexDirection: 'row',
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderId: {
    fontSize: 12,
    color: '#999',
  },
});