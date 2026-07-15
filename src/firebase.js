import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Environment variables check
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app = null;
let auth = null;
let db = null;
let firebaseInitError = null;

try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY' || !firebaseConfig.projectId || firebaseConfig.projectId === 'YOUR_PROJECT_ID') {
    throw new Error("Firebase credentials are not configured. Please check your local .env file in the project root and ensure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are set.");
  }
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  firebaseInitError = error.message || error;
}

export { app, auth, db, firebaseInitError };
