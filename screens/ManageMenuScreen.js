// screens/ManageMenuScreen.js - Updated with calorie tracking and image upload
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function ManageMenuScreen({ route, navigation }) {
  const { restaurant } = route.params;
  const { user } = useAuth();
  const { restaurants, addMenuItem, updateMenuItem, deleteMenuItem } = useData();
  const [menuItems, setMenuItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    calories: '', // Added calorie field
    category: '',
    isAvailable: true
  });

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Specials'];

  useEffect(() => {
    // Get updated restaurant data
    const updatedRestaurant = restaurants.find(r => r.id === restaurant.id);
    if (updatedRestaurant) {
      setMenuItems(updatedRestaurant.menu || []);
    }
  }, [restaurants, restaurant.id]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      calories: '',
      category: '',
      isAvailable: true
    });
    setEditingItem(null);
    setImageUri(null);
  };

  const handleAddItem = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditItem = (item) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      calories: item.calories?.toString() || '',
      category: item.category,
      isAvailable: item.isAvailable !== false
    });
    setEditingItem(item);
    setImageUri(item.image || null);
    setShowAddModal(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add menu item image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
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

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter item description');
      return false;
    }
    if (!formData.price.trim() || isNaN(parseFloat(formData.price))) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }
    if (!formData.calories.trim() || isNaN(parseFloat(formData.calories))) {
      Alert.alert('Error', 'Please enter valid calorie count');
      return false;
    }
    if (parseFloat(formData.calories) < 0) {
      Alert.alert('Error', 'Calorie count cannot be negative');
      return false;
    }
    if (!formData.category.trim()) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    return true;
  };

  const handleSaveItem = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const itemData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      calories: parseInt(formData.calories), // Store calories as integer
      category: formData.category,
      isAvailable: formData.isAvailable
    };

    let result;
    if (editingItem) {
      result = await updateMenuItem(restaurant.id, editingItem.id, itemData, imageUri);
    } else {
      result = await addMenuItem(restaurant.id, itemData, imageUri);
    }

    setLoading(false);

    if (result.success) {
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', `Menu item ${editingItem ? 'updated' : 'added'} successfully!`);
    } else {
      Alert.alert('Error', result.error || 'Failed to save menu item');
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteMenuItem(restaurant.id, item.id);
            if (result.success) {
              Alert.alert('Success', 'Menu item deleted successfully!');
            } else {
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  const handleToggleAvailability = async (item) => {
    const result = await updateMenuItem(restaurant.id, item.id, {
      isAvailable: !item.isAvailable
    });
    
    if (!result.success) {
      Alert.alert('Error', 'Failed to update item availability');
    }
  };

  const renderMenuItem = ({ item }) => (
    <View style={styles.menuItemCard}>
      <View style={styles.menuItemHeader}>
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.menuItemImage} />
        )}
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemCategory}>{item.category}</Text>
          <Text style={styles.menuItemDescription}>{item.description}</Text>
          <View style={styles.menuItemStats}>
            <Text style={styles.menuItemPrice}>£. {item.price}</Text>
            <View style={styles.calorieContainer}>
              <Ionicons name="flame-outline" size={14} color="#FF6B35" />
              <Text style={styles.calorieText}>{item.calories || 0} cal</Text>
            </View>
          </View>
        </View>
        <View style={styles.menuItemActions}>
          <TouchableOpacity
            style={[styles.availabilityButton, item.isAvailable ? styles.availableButton : styles.unavailableButton]}
            onPress={() => handleToggleAvailability(item)}
          >
            <Text style={styles.availabilityButtonText}>
              {item.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.menuItemBottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditItem(item)}
        >
          <Ionicons name="create-outline" size={16} color="#2196F3" />
          <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#F44336" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user || (restaurant.ownerId !== user.uid && user.role !== 'admin')) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="shield-outline" size={80} color="#ccc" />
        <Text style={styles.unauthorizedTitle}>Access Denied</Text>
        <Text style={styles.unauthorizedSubtitle}>
          You can only manage menu for restaurants you own
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
          <Text style={styles.headerTitle}>Menu Management</Text>
          <Text style={styles.headerSubtitle}>{restaurant.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {menuItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Menu Items</Text>
          <Text style={styles.emptySubtitle}>
            Start building your menu by adding your first item
          </Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={handleAddItem}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstButtonText}>Add First Menu Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.menuList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Menu Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                {/* Image Upload Section */}
                <View style={styles.imageSection}>
                  <Text style={styles.inputLabel}>Item Image</Text>
                  <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={30} color="#ccc" />
                        <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Item Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter item name"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your item"
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.rowContainer}>
                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Price (£.) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={formData.price}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.halfInputContainer}>
                    <Text style={styles.inputLabel}>Calories *</Text>
                    <View style={styles.calorieInputContainer}>
                      <Ionicons name="flame-outline" size={16} color="#FF6B35" style={styles.calorieIcon} />
                      <TextInput
                        style={[styles.input, styles.calorieInput]}
                        placeholder="0"
                        value={formData.calories}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, calories: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <View style={styles.categoryGrid}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          formData.category === category && styles.selectedCategoryChip
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, category }))}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          formData.category === category && styles.selectedCategoryChipText
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.inputLabel}>Available for Order</Text>
                    <TouchableOpacity
                      style={[styles.switchButton, formData.isAvailable && styles.switchButtonActive]}
                      onPress={() => setFormData(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                    >
                      <View style={[styles.switchThumb, formData.isAvailable && styles.switchThumbActive]} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSaveItem}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  menuList: {
    padding: 15,
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItemHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 6,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  menuItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  calorieText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 4,
  },
  menuItemActions: {
    alignItems: 'flex-end',
  },
  availabilityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  availableButton: {
    backgroundColor: '#E8F5E8',
  },
  unavailableButton: {
    backgroundColor: '#FFEBEE',
  },
  availabilityButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuItemBottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
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
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: '#F44336',
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
    maxHeight: '90%',
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
  formContainer: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    overflow: 'hidden',
    height: 120,
  },
  selectedImage: {
    width: '100%',
    height: 120,
  },
  imagePlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInputContainer: {
    flex: 0.48,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  calorieInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  calorieIcon: {
    marginRight: 8,
  },
  calorieInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategoryChip: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchButtonActive: {
    backgroundColor: '#4CAF50',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
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
});