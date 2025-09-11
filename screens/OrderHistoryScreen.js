// screens/UserOrderHistoryScreen.js - User's personal order history (accessed from Profile)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function UserOrderHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const { userOrders } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

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

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const renderOrderItem = ({ item }) => {
    const totalItems = item.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
    const totalCalories = item.totalCalories || item.items.reduce((sum, orderItem) => 
      sum + ((orderItem.calories || 0) * orderItem.quantity), 0
    );
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.restaurantName}>{item.restaurantName}</Text>
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
                <Text style={styles.calorieText}>{totalCalories} calories consumed</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {item.status === 'delivered' && (
            <TouchableOpacity 
              style={styles.reorderButton}
              onPress={() => {
                // Navigate to restaurant detail for reordering
                navigation.navigate('RestaurantDetail', { 
                  restaurant: { 
                    id: item.restaurantId,
                    name: item.restaurantName,
                    image: item.restaurantImage 
                  }
                });
              }}
            >
              <Text style={styles.reorderButtonText}>Reorder</Text>
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
            <Image 
              source={{ uri: selectedOrder.restaurantImage }} 
              style={styles.restaurantImage}
            />
            <View style={styles.orderDetailInfo}>
              <Text style={styles.restaurantNameModal}>{selectedOrder.restaurantName}</Text>
              <Text style={styles.orderIdText}>Order #{selectedOrder.id.slice(-6)}</Text>
              <Text style={styles.orderDateModal}>{formatDate(selectedOrder.createdAt)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
              </View>
              {totalCalories > 0 && (
                <View style={styles.calorieInfoModal}>
                  <Ionicons name="flame" size={16} color="#FF6B35" />
                  <Text style={styles.calorieTextModal}>{totalCalories} calories consumed</Text>
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
            {totalCalories > 0 && (
              <View style={[styles.totalRow, styles.calorieTotal]}>
                <Text style={styles.calorieTotalLabel}>Total Calories</Text>
                <View style={styles.calorieTotalValue}>
                  <Ionicons name="flame" size={16} color="#FF6B35" />
                  <Text style={styles.calorieTotalText}>{totalCalories} cal</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.addressText}>{selectedOrder.deliveryAddress}</Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Order History</Text>
        <View style={styles.headerRight} />
      </View>

      {userOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start exploring restaurants and place your first order!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={userOrders}
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 34,
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
  exploreButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  restaurantName: {
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
  orderId: {
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
  },
  viewButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FF6B35',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 10,
  },
  viewButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  reorderButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  reorderButtonText: {
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
    maxHeight: '80%',
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
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  orderDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantNameModal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderIdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderDateModal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  calorieInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
  calorieTotal: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  calorieTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  calorieTotalValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calorieTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 4,
  },
  deliverySection: {
    padding: 20,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});