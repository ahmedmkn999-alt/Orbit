import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../config/firebase.config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const storage = getStorage(app);

// Set persistence based on user preference
export const setAuthPersistence = async (rememberMe = true) => {
  try {
    await setPersistence(
      auth, 
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    return true;
  } catch (error) {
    console.error('Error setting persistence:', error);
    return false;
  }
};

// Phone Authentication with reCAPTCHA
let recaptchaVerifier = null;
let confirmationResult = null;

export const initRecaptcha = (elementId = 'recaptcha-container') => {
  try {
    // Clear old verifier if exists
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (_) {}
      recaptchaVerifier = null;
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        recaptchaVerifier = null;
      }
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
};

export const sendOTP = async (phoneNumber) => {
  try {
    // Format: if starts with 0 replace with +20, else if no + add +20
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+2' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+20' + formattedPhone;
    }

    const appVerifier = initRecaptcha();
    if (!appVerifier) {
      throw new Error('فشل تهيئة reCAPTCHA. يرجى تحديث الصفحة والمحاولة مرة أخرى');
    }

    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    return { success: true, message: 'تم إرسال الكود بنجاح' };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Reset reCAPTCHA on error
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (_) {}
      recaptchaVerifier = null;
    }

    // User-friendly error messages in Arabic
    let message = 'فشل إرسال الرمز. يرجى المحاولة مرة أخرى';
    if (error.code === 'auth/invalid-phone-number') {
      message = 'رقم الهاتف غير صحيح. تأكد من الصيغة الصحيحة';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'محاولات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مجدداً';
    } else if (error.code === 'auth/quota-exceeded') {
      message = 'تجاوز الحد المسموح. يرجى المحاولة لاحقاً';
    } else if (error.code === 'auth/captcha-check-failed') {
      message = 'فشل التحقق. يرجى تحديث الصفحة والمحاولة مرة أخرى';
    }
    
    return { success: false, message, code: error.code };
  }
};

export const verifyOTP = async (otp) => {
  try {
    if (!confirmationResult) {
      throw new Error('لم يتم إرسال الرمز بعد. يرجى طلب رمز جديد');
    }

    const result = await confirmationResult.confirm(otp.trim());
    const user = result.user;
    
    // Check if user exists in database
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    return { 
      success: true, 
      user,
      isNewUser: !userDoc.exists(),
      userData: userDoc.exists() ? userDoc.data() : null
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    let message = 'الرمز غير صحيح. يرجى المحاولة مرة أخرى';
    if (error.code === 'auth/code-expired') {
      message = 'انتهت صلاحية الرمز. يرجى طلب رمز جديد';
    } else if (error.code === 'auth/invalid-verification-code') {
      message = 'رمز التحقق غير صحيح';
    }
    return { success: false, message, code: error.code };
  }
};

// User Profile Management
export const createUserProfile = async (uid, profileData) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    const userData = {
      ...profileData,
      uid,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      isOnline: true,
      accountStatus: 'active',
      role: 'user',
      verified: false,
      friends: [],
      settings: {
        language: 'ar',
        theme: 'dark',
        notifications: true,
        privacy: {
          showOnlineStatus: true,
          showLastSeen: true,
          allowMessages: 'everyone'
        }
      }
    };

    await setDoc(userRef, userData);
    return { success: true, data: userData };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, message: error.message };
  }
};

export const updateUserProfile = async (uid, updates) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: error.message };
  }
};

export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, message: 'User not found' };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, message: error.message };
  }
};

// Profile Picture Upload
export const uploadProfilePicture = async (uid, file) => {
  try {
    const { uploadToCloudinary } = await import('./cloudinary.js');
    const result = await uploadToCloudinary(file, 'orbit/profile-pictures');
    
    if (!result.success) throw new Error(result.message);
    
    // Update user profile with new picture
    await updateUserProfile(uid, { profilePicture: result.url });
    
    return { success: true, url: result.url };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { success: false, message: error.message };
  }
};

// Logout
export const logout = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Update online status before logout (ignore errors)
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            isOnline: false,
            lastActive: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn('Could not update offline status:', e);
      }
    }
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, message: error.message };
  }
};

// Auth State Observer
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // Update online status only if doc exists
          await updateDoc(userRef, {
            isOnline: true,
            lastActive: serverTimestamp()
          });
          callback({ user, profile: userSnap.data() });
        } else {
          // New user - no profile yet
          callback({ user, profile: null });
        }
      } catch (error) {
        console.error('onAuthChange error:', error);
        callback({ user, profile: null });
      }
    } else {
      callback({ user: null, profile: null });
    }
  });
};

// Security: Check if user is banned
export const checkUserStatus = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        success: true,
        status: data.accountStatus,
        isBanned: data.accountStatus === 'banned',
        reason: data.banReason || null
      };
    }
    return { success: true, isBanned: false };
  } catch (error) {
    return { success: false, isBanned: false, message: error.message };
  }
};

export { auth, db, storage };
      
