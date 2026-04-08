import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  sendOTP,
  verifyOTP as firebaseVerifyOTP,
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  logout as firebaseLogout,
  onAuthChange,
  auth
} from '../services/firebase';

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
    const unsubscribe = onAuthChange(({ user, profile }) => {
      setUser(user);
      setProfile(profile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Step 1: Send OTP via Firebase Phone Auth
  const requestOTP = async (phoneNumber) => {
    setError(null);
    setLoading(true);
    try {
      const result = await sendOTP(phoneNumber);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  // Step 2: Verify OTP - محلي بدون Firebase SMS
  const verifyOTP = async (phoneNumber, otp, password, isNewUser, profileData) => {
    setError(null);
    setLoading(true);
    try {
      // التحقق تم محلياً في AdvancedAuthScreen
      // هنا بس نحفظ بيانات المستخدم في Firestore
      const fakeUid = phoneNumber.replace(/\D/g, '');
      const fakeUser = { uid: fakeUid, phoneNumber };

      if (isNewUser && profileData) {
        await createUserProfile(fakeUid, {
          ...profileData,
          phoneNumber,
        });
        const profileResult = await getUserProfile(fakeUid);
        setUser(fakeUser);
        setProfile(profileResult.data);
      } else {
        const profileResult = await getUserProfile(fakeUid);
        if (profileResult.success) {
          setUser(fakeUser);
          setProfile(profileResult.data);
        } else {
          setLoading(false);
          return { success: false, isNewUser: true };
        }
      }

      setLoading(false);
      return { success: true, isNewUser: isNewUser || false };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  // Login with password - Firebase Phone Auth مش بتدعم password login
  // بنعمل verify OTP بدلها
  const loginWithPassword = async (phoneNumber, password) => {
    setError(null);
    return { success: false, message: 'يرجى استخدام كود OTP لتسجيل الدخول' };
  };

  const forgotPassword = async (phoneNumber) => {
    // Firebase Phone Auth - بعت OTP جديد
    return await requestOTP(phoneNumber);
  };

  const resetPassword = async (phoneNumber, otp, newPassword) => {
    // Verify OTP فقط - Firebase مش بتدعم password reset بالطريقة دي
    return await firebaseVerifyOTP(otp);
  };

  const logout = async () => {
    setError(null);
    const result = await firebaseLogout();
    if (result.success) {
      setUser(null);
      setProfile(null);
    }
    return result;
  };

  const value = {
    user,
    profile,
    loading,
    error,
    requestOTP,
    verifyOTP,
    loginWithPassword,
    forgotPassword,
    resetPassword,
    logout,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
  
