// hooks/useChat.js — نظام الدردشة اللحظية مع Firebase Realtime DB

import { useState, useEffect, useCallback } from "react";
import {
  ref,
  push,
  onValue,
  off,
  set,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "../lib/firebase";
import { Crypto } from "../lib/security";

export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    const msgsRef = ref(rtdb, `chats/${chatId}/messages`);

    const unsub = onValue(msgsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, msg]) => ({
        id,
        ...msg,
        // فك التشفير عند العرض
        text: Crypto.decrypt(msg.encryptedText),
      }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
      setLoading(false);
    });

    return () => off(msgsRef, "value", unsub);
  }, [chatId]);

  const sendMessage = useCallback(
    async (senderId, text, type = "text") => {
      const msgsRef = ref(rtdb, `chats/${chatId}/messages`);
      await push(msgsRef, {
        senderId,
        encryptedText: Crypto.encrypt(text), // تشفير قبل الرفع
        type,
        timestamp: Date.now(),
        seen: false,
      });
    },
    [chatId]
  );

  return { messages, loading, sendMessage };
}

// Typing Indicator
export function useTyping(chatId, uid) {
  const setTyping = useCallback(
    (isTyping) => {
      const typingRef = ref(rtdb, `chats/${chatId}/typing/${uid}`);
      set(typingRef, isTyping ? true : null);
    },
    [chatId, uid]
  );

  const [othersTyping, setOthersTyping] = useState(false);

  useEffect(() => {
    if (!chatId || !uid) return;
    const typingRef = ref(rtdb, `chats/${chatId}/typing`);
    const unsub = onValue(typingRef, (snap) => {
      const data = snap.val() || {};
      // شيك لو في حد تاني بيكتب غيري
      const someone = Object.keys(data).some((k) => k !== uid && data[k]);
      setOthersTyping(someone);
    });
    return () => off(typingRef, "value", unsub);
  }, [chatId, uid]);

  return { setTyping, othersTyping };
}

// Online Status
export function useOnlineStatus(targetUid) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!targetUid) return;
    const presRef = ref(rtdb, `presence/${targetUid}`);
    const unsub = onValue(presRef, (snap) => {
      setOnline(snap.val()?.online || false);
    });
    return () => off(presRef, "value", unsub);
  }, [targetUid]);

  return online;
}

// جلب قائمة المحادثات
export function useConversations(uid) {
  const [convs, setConvs] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const convsRef = ref(rtdb, `userConversations/${uid}`);
    const unsub = onValue(convsRef, (snap) => {
      const data = snap.val() || {};
      setConvs(Object.values(data));
    });
    return () => off(convsRef, "value", unsub);
  }, [uid]);

  return convs;
}
