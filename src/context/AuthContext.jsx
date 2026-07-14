/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConnected, disableFirebaseConnection } from '../firebase';
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
    if (isFirebaseConnected && auth) {
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
      const restoreSession = async () => {
        const mockSession = localStorage.getItem('mock_session_uid');
        if (mockSession) {
          setCurrentUser({ uid: mockSession, email: '' }); // stub auth user
          await fetchProfileAndBusiness(mockSession);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          setBusiness(null);
        }
        setLoading(false);
      };
      restoreSession();
    }
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

      if (isFirebaseConnected) {
        try {
          // Firebase Authentication
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          uid = userCredential.user.uid;
        } catch (authErr) {
          console.error("Firebase Auth signup failed, checking if we should fallback to Mock:", authErr);
          if (authErr.code === 'auth/network-request-failed' || authErr.code === 'auth/internal-error') {
            disableFirebaseConnection();
            uid = 'mock_uid_' + Math.random().toString(36).substring(2, 9);
          } else {
            throw authErr;
          }
        }
      } else {
        // Mock Authentication
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
        if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('Email already exists');
        }
        uid = 'mock_uid_' + Math.random().toString(36).substring(2, 9);
      }

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
        if (isFirebaseConnected && userCredential?.user) {
          try {
            await userCredential.user.delete();
          } catch (deleteErr) {
            console.error("Could not delete half-created Auth user:", deleteErr);
          }
        }
        throw profileErr;
      }

      if (!isFirebaseConnected) {
        // Save the credentials in local storage for local demo logins
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const existingIdx = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        const userObj = { uid, email, name, phone, businessId: newBiz.id, role: 'owner' };
        if (existingIdx !== -1) {
          mockUsers[existingIdx] = userObj;
        } else {
          mockUsers.push(userObj);
        }
        localStorage.setItem('mock_users', JSON.stringify(mockUsers));
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
      if (isFirebaseConnected) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          uid = userCredential.user.uid;
        } catch (authErr) {
          console.error("Firebase Auth login failed, checking if we should fallback to Mock:", authErr);
          if (authErr.code === 'auth/network-request-failed' || authErr.code === 'auth/internal-error') {
            disableFirebaseConnection();
            const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
            const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!user) {
              throw new Error('User not found. Register an account first.', { cause: authErr });
            }
            uid = user.uid;
            localStorage.setItem('mock_session_uid', uid);
            setCurrentUser({ uid, email });
          } else {
            throw authErr;
          }
        }
      } else {
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
          throw new Error('User not found. Register an account first.');
        }
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
      if (isFirebaseConnected) {
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
    isMockMode: !isFirebaseConnected
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
