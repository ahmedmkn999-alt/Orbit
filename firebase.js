// lib/firebase.js — Firebase initialization & exports
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBD6AC1xo3CCQn-Wk82r8nheWiu5Hf8-fo",
  authDomain: "orbit-284fb.firebaseapp.com",
  databaseURL: "https://orbit-284fb-default-rtdb.firebaseio.com",
  projectId: "orbit-284fb",
  storageBucket: "orbit-284fb.firebasestorage.app",
  messagingSenderId: "618534849025",
  appId: "1:618534849025:web:0ba7eb11a7f5840a1f4e00",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
