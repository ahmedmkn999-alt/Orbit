// components/Chat/index.jsx — نظام الدردشة اللحظي الكامل

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, getDocs,
  addDoc, onSnapshot, orderBy, serverTimestamp, doc, getDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useMessages, useTyping, useOnlineStatus } from "../../hooks/useChat";
import { T, GlassCard, Avatar, Button, Input, VerifiedBadge, Spinner } from "../Shared";
import { uploadMedia } from "../../lib/cloudinary";

// ─── Chat List ────────────────────────────────────────────────
function ChatList({ user, onOpen }) {
  const [conversations, setConvs] = useState([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [allUsers, setAllUsers]   = useState([]);

  useEffect(() => {
    // جلب كل المستخدمين للبحث
    getDocs(collection(db, "users")).then((snap) => {
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.uid !== user.uid));
      setLoading(false);
    });
  }, [user.uid]);

  const filteredUsers = search
    ? allUsers.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()))
    : allUsers;

  const getChatId = (uid1, uid2) =>
    [uid1, uid2].sort().join("_");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingBottom: 80 }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <h2 style={{ margin: "0 0 14px", color: T.textPrimary, fontSize: 20 }}>💬 المحادثات</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث عن مستخدم..."
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && <div style={{ textAlign: "center", padding: 32 }}><Spinner size={36} /></div>}

        {filteredUsers.map((u) => (
          <GlassCard
            key={u.id}
            onClick={() => onOpen({ ...u, chatId: getChatId(user.uid, u.uid || u.id) })}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: 14 }}
            className="orbit-card"
          >
            <OnlineAvatar uid={u.uid || u.id} name={u.name} avatar={u.avatar} verified={u.verified} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ color: T.textPrimary, fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                {u.verified && <VerifiedBadge size={14} />}
              </div>
              <span style={{ color: T.textMuted, fontSize: 12 }}>
                {u.bio || "مستخدم Orbit"}
              </span>
            </div>
            <span style={{ fontSize: 20, color: T.cyan }}>›</span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function OnlineAvatar({ uid, name, avatar, verified }) {
  const online = useOnlineStatus(uid);
  return <Avatar src={avatar} name={name} size={50} online={online} verified={verified} />;
}

// ─── Chat Window ──────────────────────────────────────────────
function ChatWindow({ chat, user, onBack }) {
  const { messages, loading, sendMessage } = useMessages(chat.chatId);
  const { setTyping, othersTyping }         = useTyping(chat.chatId, user.uid);
  const online = useOnlineStatus(chat.uid || chat.id);
  const [input, setInput]   = useState("");
  const [sending, setSend]  = useState(false);
  const bottomRef = useRef();
  const fileRef   = useRef();
  const typingTimer = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, othersTyping]);

  const handleInput = (val) => {
    setInput(val);
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1500);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setSend(true);
    setTyping(false);
    await sendMessage(user.uid, input.trim());
    setInput("");
    setSend(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSend(true);
    const { url } = await uploadMedia(file, "orbit/chat");
    await sendMessage(user.uid, url, file.type.startsWith("video") ? "video" : "image");
    setSend(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: T.bgCard,
        borderBottom: `1px solid ${T.border}`,
        backdropFilter: "blur(20px)",
      }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: T.cyan, fontSize: 22, cursor: "pointer", padding: 0 }}
        >←</button>
        <Avatar src={chat.avatar} name={chat.name} size={42} online={online} verified={chat.verified} />
        <div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15 }}>{chat.name}</span>
            {chat.verified && <VerifiedBadge size={14} />}
          </div>
          <span style={{ color: online ? T.green : T.textMuted, fontSize: 12 }}>
            {online ? "● متصل الآن" : "غير متصل"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 12px",
        display: "flex", flexDirection: "column", gap: 10,
        background: `linear-gradient(180deg, ${T.bg} 0%, rgba(10,25,47,0.97) 100%)`,
      }}>
        {loading && <div style={{ textAlign: "center", padding: 20 }}><Spinner /></div>}

        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          return (
            <div key={msg.id} style={{
              display: "flex",
              justifyContent: isMe ? "flex-start" : "flex-end",
              animation: "fadeIn 0.2s ease",
            }}>
              <div style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: isMe ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                background: isMe
                  ? T.bgCard
                  : `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
                color: isMe ? T.textPrimary : T.bg,
                border: isMe ? `1px solid ${T.border}` : "none",
                boxShadow: isMe ? "none" : T.cyanGlow,
                fontSize: 14, lineHeight: 1.6,
              }}>
                {msg.type === "image"
                  ? <img src={msg.text} alt="img" style={{ maxWidth: 220, borderRadius: 10, display: "block" }} />
                  : msg.type === "video"
                  ? <video src={msg.text} controls style={{ maxWidth: 220, borderRadius: 10 }} />
                  : <p style={{ margin: 0 }}>{msg.text}</p>
                }
                <span style={{
                  fontSize: 10, display: "block", marginTop: 4, textAlign: "left",
                  color: isMe ? T.textMuted : "rgba(10,25,47,0.6)",
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                  {isMe && " ✓✓"}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {othersTyping && (
          <div style={{ display: "flex", gap: 5, padding: "4px 14px", alignItems: "center" }}>
            <span style={{ color: T.textMuted, fontSize: 12 }}>{chat.name} يكتب</span>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%", background: T.cyan,
                animation: `pulse 1s ease ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 12px",
        background: T.bgCard, borderTop: `1px solid ${T.border}`,
        backdropFilter: "blur(20px)", alignItems: "center",
      }}>
        <button
          onClick={() => fileRef.current?.click()}
          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}
        >📎</button>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} style={{ display: "none" }} />

        <input
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="اكتب رسالتك..."
          style={{
            flex: 1, padding: "11px 16px",
            borderRadius: 24,
            border: `1px solid ${T.border}`,
            background: T.bgGlass,
            color: T.textPrimary,
            fontSize: 14, fontFamily: T.font,
            outline: "none",
          }}
        />
        <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>🎤</button>
        <Button onClick={handleSend} disabled={!input.trim() || sending} style={{ borderRadius: "50%", width: 42, height: 42, padding: 0 }}>
          {sending ? "⏳" : "➤"}
        </Button>
      </div>
    </div>
  );
}

// ─── Chat Page ────────────────────────────────────────────────
export default function ChatPage({ user }) {
  const [activeChat, setActive] = useState(null);
  return activeChat
    ? <ChatWindow chat={activeChat} user={user} onBack={() => setActive(null)} />
    : <ChatList user={user} onOpen={setActive} />;
}
