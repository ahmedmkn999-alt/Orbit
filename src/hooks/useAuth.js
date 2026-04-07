// hooks/useAuth.js — إدارة حالة المستخدم مع Firebase

import { useState, useEffect, createContext, useContext } from "react";
import {
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, set, onDisconnect } from "firebase/database";
import { auth, db, rtdb } from "../lib/firebase";
import { ADMIN_PHONE } from "../lib/security";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = جاري التحميل

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // جلب بيانات المستخدم من Firestore
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const data = snap.data() || {};
        const userData = {
          uid: firebaseUser.uid,
          name: data.name || firebaseUser.displayName || "مستخدم Orbit",
          phone: data.phone || "",
          avatar: data.avatar || null,
          verified: data.verified || false,
          isAdmin: data.phone === ADMIN_PHONE,
          bio: data.bio || "",
        };
        setUser(userData);

        // تحديث حالة الاتصال في Realtime DB
        const presenceRef = ref(rtdb, `presence/${firebaseUser.uid}`);
        set(presenceRef, { online: true, lastSeen: Date.now() });
        onDisconnect(presenceRef).set({ online: false, lastSeen: Date.now() });
      } else {
        setUser(null);
      }
    });
    return unsub;
  }, []);

  const logout = async () => {
    if (auth.currentUser) {
      const presenceRef = ref(rtdb, `presence/${auth.currentUser.uid}`);
      await set(presenceRef, { online: false, lastSeen: Date.now() });
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// حفظ بيانات المستخدم في Firestore بعد التسجيل
export async function saveUserProfile(uid, data) {
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
