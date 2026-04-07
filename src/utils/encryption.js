import CryptoJS from 'crypto-js';

// Get encryption key from environment
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production';

// Encrypt data
export const encrypt = (data) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data), 
      ENCRYPTION_KEY
    ).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Decrypt data
export const decrypt = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Hash data (for passwords, sensitive info)
export const hash = (data) => {
  return CryptoJS.SHA256(data).toString();
};

// Generate random token
export const generateToken = (length = 32) => {
  return CryptoJS.lib.WordArray.random(length).toString();
};

// Encrypt local storage data
export const setSecureItem = (key, value) => {
  try {
    const encrypted = encrypt(value);
    localStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    console.error('Error setting secure item:', error);
    return false;
  }
};

// Decrypt local storage data
export const getSecureItem = (key) => {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return decrypt(encrypted);
  } catch (error) {
    console.error('Error getting secure item:', error);
    return null;
  }
};

// Remove secure item
export const removeSecureItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing secure item:', error);
    return false;
  }
};

// End-to-end encryption for messages
export const encryptMessage = (message, recipientPublicKey) => {
  // In production, use proper E2E encryption with public/private keys
  // This is a simplified version
  try {
    return encrypt({
      content: message,
      timestamp: Date.now(),
      encrypted: true
    });
  } catch (error) {
    console.error('Message encryption error:', error);
    return null;
  }
};

export const decryptMessage = (encryptedMessage) => {
  try {
    const decrypted = decrypt(encryptedMessage);
    return decrypted?.content || null;
  } catch (error) {
    console.error('Message decryption error:', error);
    return null;
  }
};

export default {
  encrypt,
  decrypt,
  hash,
  generateToken,
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  encryptMessage,
  decryptMessage
};
