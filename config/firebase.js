// config/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANXFtsCnMsdoPSbCPHXkdW4IMPaU5aTd8",
  authDomain: "restaurantapp-a8651.firebaseapp.com",
  projectId: "restaurantapp-a8651",
  storageBucket: "restaurantapp-a8651.firebasestorage.app",
  messagingSenderId: "149746158775",
  appId: "1:149746158775:web:129631e1a685386c7f1132",
  measurementId: "G-76F0VL6NED"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;