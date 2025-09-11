// DataContext.js - Updated with calorie tracking support
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time restaurants listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'restaurants'),
      (snapshot) => {
        const restaurantData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRestaurants(restaurantData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching restaurants:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Real-time orders listener for current user
  useEffect(() => {
    if (user) {
      console.log('Setting up orders listener for user:', user.uid);
      
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Orders snapshot received, docs count:', snapshot.docs.length);
        
        const orderData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Order doc:', doc.id, data);
          return {
            id: doc.id,
            ...data
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort in memory instead
        
        console.log('Processed order data:', orderData);
        setUserOrders(orderData);
      }, (error) => {
        console.error('Error in orders listener:', error);
      });

      return unsubscribe;
    } else {
      // Clear orders when user logs out
      setUserOrders([]);
    }
  }, [user]);

  // Real-time all orders listener for restaurant owners
  useEffect(() => {
    if (user) {
      // Get orders for all restaurants, not just admin
      const q = query(
        collection(db, 'orders'),
        limit(200) // Increase limit for restaurant owners
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('All orders snapshot received, docs count:', snapshot.docs.length);
        
        const orderData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort in memory instead
        
        setOrders(orderData);
      }, (error) => {
        console.error('Error in all orders listener:', error);
      });

      return unsubscribe;
    } else {
      // Clear orders when user logs out
      setOrders([]);
    }
  }, [user]);

  // CLOUDINARY: Enhanced image upload with Cloudinary
  const uploadImage = async (uri, folder = 'restaurants') => {
    try {
      console.log('🌩️ Starting Cloudinary upload...', { uri, folder });
      
      // Validate URI
      if (!uri) {
        throw new Error('No image URI provided');
      }

      // Upload to Cloudinary with optimizations
      const result = await uploadToCloudinary(uri, {
        folder: `food-delivery/${folder}`,
        transformation: [
          {
            width: 800,
            height: 600,
            crop: 'fill',
            gravity: 'auto',
            format: 'auto',
            quality: 'auto:good'
          }
        ]
      });

      if (result.success) {
        console.log('✅ Cloudinary upload successful:', result.url);
        return result.url;
      } else {
        throw new Error('Upload failed');
      }
      
    } catch (error) {
      console.error('❌ Image upload error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Network error while uploading image. Please check your internet connection and try again.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Upload timed out. Please try again with a smaller image.');
      } else if (error.message?.includes('Invalid image')) {
        throw new Error('Invalid image file. Please select a valid image.');
      } else {
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }
  };

  // CLOUDINARY: Add restaurant with Cloudinary image handling
  const addRestaurant = async (restaurantData, imageUri) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to add a restaurant');
      }

      console.log('🏪 Adding restaurant:', restaurantData.name);

      let imageUrl = '';
      let cloudinaryPublicId = '';
      
      // Upload image if provided
      if (imageUri) {
        try {
          console.log('📸 Processing image upload...');
          imageUrl = await uploadImage(imageUri, `restaurants/${user.uid}`);
          
          // Extract public ID from Cloudinary URL for future reference
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          cloudinaryPublicId = filename.split('.')[0];
          
          console.log('✅ Image uploaded successfully:', imageUrl);
        } catch (imageError) {
          console.error('⚠️ Image upload failed:', imageError.message);
          
          // Return error with image upload failure info so UI can handle it
          return { 
            success: false, 
            error: `Image upload failed: ${imageError.message}`,
            isImageError: true 
          };
        }
      }

      // Create restaurant document
      const restaurantDoc = {
        ...restaurantData,
        image: imageUrl,
        imagePublicId: cloudinaryPublicId, // Store for potential deletion later
        rating: 0,
        reviewCount: 0,
        menu: [],
        isActive: true,
        ownerId: user.uid,
        ownerName: user.name || user.email,
        ownerEmail: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('💾 Saving restaurant document...');
      const docRef = await addDoc(collection(db, 'restaurants'), restaurantDoc);
      console.log('✅ Restaurant saved with ID:', docRef.id);
      
      // Update user's owned restaurants list
      await updateUserOwnedRestaurants(user.uid, docRef.id, 'add');

      return { success: true, restaurantId: docRef.id };
    } catch (error) {
      console.error('❌ Error adding restaurant:', error);
      return { success: false, error: error.message };
    }
  };

  // Update restaurant (only owner or admin can update)
  const updateRestaurant = async (restaurantId, updateData, newImageUri = null) => {
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Check if user is owner or admin
      if (restaurant.ownerId !== user.uid && user.role !== 'admin') {
        throw new Error('You can only update restaurants you own');
      }

      let finalUpdateData = { ...updateData };

      // Handle image update if new image provided
      if (newImageUri) {
        try {
          // Upload new image
          const newImageUrl = await uploadImage(newImageUri, `restaurants/${restaurant.ownerId}`);
          
          // Delete old image if it exists
          if (restaurant.imagePublicId) {
            await deleteFromCloudinary(restaurant.imagePublicId);
          }
          
          // Extract new public ID
          const urlParts = newImageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const newPublicId = filename.split('.')[0];
          
          finalUpdateData = {
            ...finalUpdateData,
            image: newImageUrl,
            imagePublicId: newPublicId
          };
        } catch (imageError) {
          return { 
            success: false, 
            error: `Image update failed: ${imageError.message}`,
            isImageError: true 
          };
        }
      }

      await updateDoc(doc(db, 'restaurants', restaurantId), {
        ...finalUpdateData,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating restaurant:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete restaurant (only owner or admin can delete)
  const deleteRestaurant = async (restaurantId) => {
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Check if user is owner or admin
      if (restaurant.ownerId !== user.uid && user.role !== 'admin') {
        throw new Error('You can only delete restaurants you own');
      }

      // Delete image from Cloudinary if it exists
      if (restaurant.imagePublicId) {
        try {
          await deleteFromCloudinary(restaurant.imagePublicId);
          console.log('✅ Image deleted from Cloudinary');
        } catch (imageError) {
          console.warn('⚠️ Failed to delete image from Cloudinary:', imageError);
          // Continue with restaurant deletion even if image deletion fails
        }
      }

      await deleteDoc(doc(db, 'restaurants', restaurantId));
      
      // Update user's owned restaurants list
      await updateUserOwnedRestaurants(restaurant.ownerId, restaurantId, 'remove');
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      return { success: false, error: error.message };
    }
  };

  // Update user's owned restaurants list
  const updateUserOwnedRestaurants = async (userId, restaurantId, action) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let ownedRestaurants = userData.ownedRestaurants || [];
        
        if (action === 'add' && !ownedRestaurants.includes(restaurantId)) {
          ownedRestaurants.push(restaurantId);
        } else if (action === 'remove') {
          ownedRestaurants = ownedRestaurants.filter(id => id !== restaurantId);
        }
        
        await updateDoc(userDocRef, {
          ownedRestaurants,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating user owned restaurants:', error);
    }
  };

  // Add to favorites with proper user context update
  const addToFavorites = async (restaurantId) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      console.log('❤️ Adding to favorites:', restaurantId);

      const currentFavorites = user.favoriteRestaurants || [];
      
      // Check if already in favorites
      if (currentFavorites.includes(restaurantId)) {
        console.log('ℹ️ Restaurant already in favorites');
        return { success: true, message: 'Already in favorites' };
      }

      const updatedFavorites = [...currentFavorites, restaurantId];
      
      // Update in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        favoriteRestaurants: updatedFavorites,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Added to favorites successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error adding to favorites:', error);
      return { success: false, error: error.message };
    }
  };

  // Remove from favorites with proper user context update
  const removeFromFavorites = async (restaurantId) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      console.log('💔 Removing from favorites:', restaurantId);

      const currentFavorites = user.favoriteRestaurants || [];
      const updatedFavorites = currentFavorites.filter(id => id !== restaurantId);
      
      // Update in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        favoriteRestaurants: updatedFavorites,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Removed from favorites successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing from favorites:', error);
      return { success: false, error: error.message };
    }
  };

  // Toggle favorites function
  const toggleFavorite = async (restaurantId) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      const currentFavorites = user.favoriteRestaurants || [];
      const isFavorite = currentFavorites.includes(restaurantId);
      
      if (isFavorite) {
        return await removeFromFavorites(restaurantId);
      } else {
        return await addToFavorites(restaurantId);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      return { success: false, error: error.message };
    }
  };

  // Add menu item to restaurant (only owner can add) - UPDATED with calorie tracking and image upload
  const addMenuItem = async (restaurantId, menuItem, imageUri = null) => {
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Check if user is owner or admin
      if (restaurant.ownerId !== user.uid && user.role !== 'admin') {
        throw new Error('You can only manage menu for restaurants you own');
      }

      let finalMenuItem = { ...menuItem };

      // Upload menu item image if provided
      if (imageUri) {
        try {
          const imageUrl = await uploadImage(imageUri, `menu/${restaurant.ownerId}`);
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const publicId = filename.split('.')[0];
          
          finalMenuItem = {
            ...finalMenuItem,
            image: imageUrl,
            imagePublicId: publicId
          };
        } catch (imageError) {
          return { 
            success: false, 
            error: `Menu item image upload failed: ${imageError.message}`,
            isImageError: true 
          };
        }
      }

      // Ensure calories is stored as integer
      if (finalMenuItem.calories) {
        finalMenuItem.calories = parseInt(finalMenuItem.calories);
      }

      const updatedMenu = [...(restaurant.menu || []), { 
        ...finalMenuItem, 
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }];
      
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        menu: updatedMenu,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding menu item:', error);
      return { success: false, error: error.message };
    }
  };

  // Update menu item - UPDATED with calorie tracking and image upload
  const updateMenuItem = async (restaurantId, menuItemId, updateData, newImageUri = null) => {
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Check if user is owner or admin
      if (restaurant.ownerId !== user.uid && user.role !== 'admin') {
        throw new Error('You can only manage menu for restaurants you own');
      }

      let finalUpdateData = { ...updateData };

      // Ensure calories is stored as integer
      if (finalUpdateData.calories) {
        finalUpdateData.calories = parseInt(finalUpdateData.calories);
      }

      // Handle image update if new image provided
      if (newImageUri) {
        try {
          const newImageUrl = await uploadImage(newImageUri, `menu/${restaurant.ownerId}`);
          
          // Find and delete old image if it exists
          const menuItem = restaurant.menu.find(item => item.id === menuItemId);
          if (menuItem?.imagePublicId) {
            await deleteFromCloudinary(menuItem.imagePublicId);
          }
          
          const urlParts = newImageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const newPublicId = filename.split('.')[0];
          
          finalUpdateData = {
            ...finalUpdateData,
            image: newImageUrl,
            imagePublicId: newPublicId
          };
        } catch (imageError) {
          return { 
            success: false, 
            error: `Menu item image update failed: ${imageError.message}`,
            isImageError: true 
          };
        }
      }

      const updatedMenu = restaurant.menu.map(item => 
        item.id === menuItemId 
          ? { ...item, ...finalUpdateData, updatedAt: new Date().toISOString() }
          : item
      );
      
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        menu: updatedMenu,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating menu item:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete menu item
  const deleteMenuItem = async (restaurantId, menuItemId) => {
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      if (!user) {
        throw new Error('User must be logged in');
      }
      
      // Check if user is owner or admin
      if (restaurant.ownerId !== user.uid && user.role !== 'admin') {
        throw new Error('You can only manage menu for restaurants you own');
      }

      // Find menu item to get image public ID
      const menuItem = restaurant.menu.find(item => item.id === menuItemId);
      
      // Delete image from Cloudinary if it exists
      if (menuItem?.imagePublicId) {
        try {
          await deleteFromCloudinary(menuItem.imagePublicId);
        } catch (imageError) {
          console.warn('⚠️ Failed to delete menu item image:', imageError);
        }
      }

      const updatedMenu = restaurant.menu.filter(item => item.id !== menuItemId);
      
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        menu: updatedMenu,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return { success: false, error: error.message };
    }
  };

  // Place order - UPDATED with calorie tracking
  const placeOrder = async (orderData) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to place order');
      }

      // Calculate total calories from order items
      let totalCalories = 0;
      if (orderData.items) {
        totalCalories = orderData.items.reduce((total, item) => {
          const itemCalories = item.calories || 0;
          const quantity = item.quantity || 1;
          return total + (itemCalories * quantity);
        }, 0);
      }

      const order = {
        ...orderData,
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        totalCalories, // Store total calories in order
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), order);
      
      // Update user's calorie consumption tracking
      await updateUserCalorieConsumption(user.uid, totalCalories);
      
      return { success: true };
    } catch (error) {
      console.error('Error placing order:', error);
      return { success: false, error: error.message };
    }
  };

  // Update user's calorie consumption tracking
  const updateUserCalorieConsumption = async (userId, calories) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Initialize calorie tracking if it doesn't exist
        const calorieTracking = userData.calorieTracking || {};
        
        // Update daily calories
        calorieTracking[today] = (calorieTracking[today] || 0) + calories;
        
        await updateDoc(userDocRef, {
          calorieTracking,
          totalCaloriesConsumed: (userData.totalCaloriesConsumed || 0) + calories,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Updated user calorie consumption: +${calories} calories for ${today}`);
      }
    } catch (error) {
      console.error('Error updating user calorie consumption:', error);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: error.message };
    }
  };

  // Add review and rating
  const addReview = async (restaurantId, rating, review) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to add review');
      }

      const reviewData = {
        restaurantId,
        userId: user.uid,
        userName: user.name,
        rating,
        review,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'reviews'), reviewData);

      // Update restaurant rating
      const restaurant = restaurants.find(r => r.id === restaurantId);
      const currentRating = restaurant.rating || 0;
      const currentReviewCount = restaurant.reviewCount || 0;
      const newReviewCount = currentReviewCount + 1;
      const newRating = ((currentRating * currentReviewCount) + rating) / newReviewCount;

      await updateDoc(doc(db, 'restaurants', restaurantId), {
        rating: newRating,
        reviewCount: newReviewCount
      });

      return { success: true };
    } catch (error) {
      console.error('Error adding review:', error);
      return { success: false, error: error.message };
    }
  };

  // Get user's owned restaurants
  const getUserOwnedRestaurants = () => {
    if (!user) return [];
    return restaurants.filter(restaurant => restaurant.ownerId === user.uid);
  };

  // Check if user owns any restaurants
  const userOwnsRestaurants = () => {
    if (!user) return false;
    return restaurants.some(restaurant => restaurant.ownerId === user.uid);
  };

  // Get orders for user's restaurants
  const getRestaurantOrders = (restaurantId = null) => {
    if (!user) return [];
    
    const userRestaurantIds = restaurants
      .filter(restaurant => restaurant.ownerId === user.uid)
      .map(restaurant => restaurant.id);
    
    let filteredOrders = orders.filter(order => 
      userRestaurantIds.includes(order.restaurantId)
    );
    
    // Further filter by specific restaurant if provided
    if (restaurantId) {
      filteredOrders = filteredOrders.filter(order => order.restaurantId === restaurantId);
    }
    
    return filteredOrders;
  };

  // Get user's calorie statistics
  const getUserCalorieStats = (timeframe = 'daily') => {
    if (!user || !userOrders) return 0;

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

    return filteredOrders.reduce((total, order) => {
      return total + (order.totalCalories || 0);
    }, 0);
  };

  const value = {
    restaurants,
    orders,
    userOrders,
    loading,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    placeOrder,
    updateOrderStatus,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    addReview,
    uploadImage,
    getUserOwnedRestaurants,
    userOwnsRestaurants,
    getRestaurantOrders,
    getUserCalorieStats
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};