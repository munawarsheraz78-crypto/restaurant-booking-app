// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            console.log('User authenticated:', firebaseUser.email);
            
            // Get user data from Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData
              });
            } else {
              console.log('Creating new user document');
              // Create default user document if it doesn't exist
              const userData = {
                email: firebaseUser.email,
                role: 'customer',
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                createdAt: new Date().toISOString(),
                favoriteRestaurants: [],
                orderHistory: []
              };
              
              await setDoc(userDocRef, userData);
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData
              });
            }
          } else {
            console.log('User signed out');
            setUser(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signup = async (email, password, userData) => {
    try {
      console.log('Attempting signup for:', email);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('User created successfully:', firebaseUser.uid);
      
      // Create user document in Firestore
      const userDocData = {
        ...userData,
        email,
        role: 'customer',
        createdAt: new Date().toISOString(),
        favoriteRestaurants: [],
        orderHistory: []
      };
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, userDocData);
      
      console.log('User document created in Firestore');
      
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please enter a valid email.';
      } else if (error.code === 'auth/api-key-not-valid') {
        errorMessage = 'Firebase configuration error. Please check your setup.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updateData) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, updateData, { merge: true });
      
      setUser(prev => ({ ...prev, ...updateData }));
      console.log('Profile updated successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    signup,
    login,
    logout,
    updateUserProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};