import React, { createContext, useContext, useState, useEffect } from 'react';
import { setSecureItem, getSecureItem, removeSecureItem } from '../utils/encryption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    // Check for cached session
    const cachedToken = getSecureItem('orbit_session');
    if (cachedToken) {
      verifySession(cachedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifySession = async (sessionToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setProfile(data.user);
      } else {
        removeSecureItem('orbit_session');
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Session verification error:', err);
      removeSecureItem('orbit_session');
    } finally {
      setLoading(false);
    }
  };

  const requestOTP = async (phoneNumber) => {
    setError(null);
    setLoading(true);
    
    console.log('🔵 Requesting OTP for:', phoneNumber);
    console.log('🔵 API URL:', API_URL);
    
    try {
      const response = await fetch(`${API_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      console.log('🔵 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔵 Response data:', data);
      
      setLoading(false);
      return data;
    } catch (err) {
      console.error('🔴 Error in requestOTP:', err);
      setError(err.message);
      setLoading(false);
      return { 
        success: false, 
        message: `فشل الاتصال بالخادم: ${err.message}\nتأكد من تشغيل Backend على المنفذ 3000` 
      };
    }
  };

  const verifyOTP = async (phoneNumber, otp, password, isNewUser, profileData) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber, 
          otp, 
          password, 
          isNewUser, 
          profileData 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setProfile(data.user);
        setSecureItem('orbit_session', data.sessionToken);
      }
      
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: 'فشل الاتصال بالخادم' };
    }
  };

  const loginWithPassword = async (phoneNumber, password) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setProfile(data.user);
        setSecureItem('orbit_session', data.sessionToken);
      }
      
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: 'فشل الاتصال بالخادم' };
    }
  };

  const forgotPassword = async (phoneNumber) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: 'فشل الاتصال بالخادم' };
    }
  };

  const resetPassword = async (phoneNumber, otp, newPassword) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp, newPassword })
      });
      
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: 'فشل الاتصال بالخادم' };
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    
    try {
      setUser(null);
      setProfile(null);
      removeSecureItem('orbit_session');
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
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
    
