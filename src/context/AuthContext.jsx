import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConfigured } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { dbService } from '../services/dbService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Auth and Fetch Profile details
  const fetchProfileAndBusiness = async (uid) => {
    try {
      const profile = await dbService.getUserProfile(uid);
      if (profile) {
        setUserProfile(profile);
        const biz = await dbService.getBusiness(profile.businessId);
        setBusiness(biz);
      } else {
        setUserProfile(null);
        setBusiness(null);
      }
    } catch (err) {
      console.error("Error fetching auth details:", err);
      setUserProfile(null);
      setBusiness(null);
    }
  };

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          await fetchProfileAndBusiness(user.uid);
        } else {
          setUserProfile(null);
          setBusiness(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Mock session restoration from localStorage
      const mockSession = localStorage.getItem('mock_session_uid');
      if (mockSession) {
        setCurrentUser({ uid: mockSession, email: '' }); // stub auth user
        fetchProfileAndBusiness(mockSession).then(() => setLoading(false));
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setBusiness(null);
        setLoading(false);
      }
    }
  }, []);

  // --- SIGN UP ---
  const signup = async (email, password, name, phone, businessName, businessType) => {
    setLoading(true);
    try {
      // 1. Create the business record first to get the businessId
      const newBiz = await dbService.createBusiness({
        name: businessName,
        type: businessType
      });

      let uid;
      if (isFirebaseConfigured) {
        // Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
      } else {
        // Mock Authentication
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
        if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('Email already exists');
        }
        uid = 'mock_uid_' + Math.random().toString(36).substring(2, 9);
      }

      // 2. Create the user profile linked to the business
      const profile = await dbService.createUserProfile(uid, {
        name,
        email,
        phone,
        businessId: newBiz.id,
        role: 'owner'
      });

      if (!isFirebaseConfigured) {
        localStorage.setItem('mock_session_uid', uid);
        setCurrentUser({ uid, email });
      }

      setUserProfile(profile);
      setBusiness(newBiz);
      return { uid, profile, business: newBiz };
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN ---
  const login = async (email, password) => {
    setLoading(true);
    try {
      let uid;
      if (isFirebaseConfigured) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
      } else {
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
          throw new Error('User not found. Register an account first.');
        }
        // In simple local mock mode, let's allow any password for demo purposes, 
        // or check for simple validation. We will just log them in.
        uid = user.uid;
        localStorage.setItem('mock_session_uid', uid);
        setCurrentUser({ uid, email });
      }

      await fetchProfileAndBusiness(uid);
      return uid;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT ---
  const logout = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        await firebaseSignOut(auth);
      } else {
        localStorage.removeItem('mock_session_uid');
        setCurrentUser(null);
      }
      setUserProfile(null);
      setBusiness(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userProfile,
    business,
    loading,
    signup,
    login,
    logout,
    isMockMode: !isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
