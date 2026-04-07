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
    if (!recaptchaVerifier) {
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
    }
    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
};

export const sendOTP = async (phoneNumber) => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+20${phoneNumber}`;
    const appVerifier = initRecaptcha();
    
    if (!appVerifier) {
      throw new Error('Failed to initialize reCAPTCHA');
    }

    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Reset reCAPTCHA on error
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    
    return { 
      success: false, 
      message: error.message || 'Failed to send OTP',
      code: error.code 
    };
  }
};

export const verifyOTP = async (otp) => {
  try {
    if (!confirmationResult) {
      throw new Error('No confirmation result available');
    }

    const result = await confirmationResult.confirm(otp);
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
    return { 
      success: false, 
      message: 'Invalid OTP code',
      code: error.code 
    };
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
      // Update online status before logout
      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: false,
        lastActive: serverTimestamp()
      });
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
      // Update online status
      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: true,
        lastActive: serverTimestamp()
      });
      
      // Get user profile data
      const profile = await getUserProfile(user.uid);
      callback({ user, profile: profile.data });
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
    return { success: false, message: 'User not found' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export { auth, db, storage };
