import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  sendOTP, 
  verifyOTP, 
  logout as firebaseLogout,
  onAuthChange,
  getUserProfile,
  updateUserProfile,
  checkUserStatus
} from '../services/firebase';
import { setSecureItem, getSecureItem, removeSecureItem } from '../utils/encryption';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for cached user
    const cachedUser = getSecureItem('orbit_user');
    if (cachedUser) {
      setUser(cachedUser);
    }

    // Listen to auth state changes
    const unsubscribe = onAuthChange(async ({ user: firebaseUser, profile: userProfile }) => {
      if (firebaseUser) {
        // Only check ban status if user has a profile (existing user)
        if (userProfile) {
          const status = await checkUserStatus(firebaseUser.uid);
          if (status.isBanned) {
            await handleLogout();
            setError(`Account banned: ${status.reason}`);
            return;
          }
        }

        setUser(firebaseUser);
        setProfile(userProfile);
        setSecureItem('orbit_user', firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
        removeSecureItem('orbit_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSendOTP = async (phoneNumber) => {
    setError(null);
    setLoading(true);
    try {
      const result = await sendOTP(phoneNumber);
      setLoading(false);
      return result;
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, message: error.message };
    }
  };

  const handleVerifyOTP = async (otp) => {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOTP(otp);
      setLoading(false);
      return result;
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, message: error.message };
    }
  };

  const handleLogout = async () => {
    setError(null);
    setLoading(true);
    try {
      await firebaseLogout();
      setUser(null);
      setProfile(null);
      removeSecureItem('orbit_user');
      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, message: error.message };
    }
  };

  const updateProfile = async (updates) => {
    setError(null);
    try {
      if (!user) throw new Error('No user logged in');
      const result = await updateUserProfile(user.uid, updates);
      if (result.success) {
        // Refresh profile
        const updatedProfile = await getUserProfile(user.uid);
        setProfile(updatedProfile.data);
      }
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    sendOTP: handleSendOTP,
    verifyOTP: handleVerifyOTP,
    logout: handleLogout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
