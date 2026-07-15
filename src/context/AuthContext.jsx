/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
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
  }, []);

  // --- SIGN UP ---
  const signup = async (email, password, name, phone, businessName, businessType) => {
    setLoading(true);
    let newBiz;
    let uid;
    let userCredential;

    try {
      // 1. Create the business record first to get the businessId
      newBiz = await dbService.createBusiness({
        name: businessName,
        type: businessType
      });

      // Firebase Authentication
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      uid = userCredential.user.uid;

      // 2. Create the user profile linked to the business
      let profile;
      try {
        profile = await dbService.createUserProfile(uid, {
          name,
          email,
          phone,
          businessId: newBiz.id,
          role: 'owner'
        });
      } catch (profileErr) {
        console.error("Firestore createUserProfile failed:", profileErr);
        // Clean up partially registered auth user if needed
        if (userCredential?.user) {
          try {
            await userCredential.user.delete();
          } catch (deleteErr) {
            console.error("Could not delete half-created Auth user:", deleteErr);
          }
        }
        throw profileErr;
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
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
      await firebaseSignOut(auth);
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
