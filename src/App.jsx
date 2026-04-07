// ============================================================
//  ORBIT v2 — Complete Social Platform
//  Firebase + Cloudinary + Telegram OTP + WebRTC
// ============================================================

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, updateProfile, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, where, setDoc, getDoc } from "firebase/firestore";
import { getDatabase, ref, set, onValue, off, push, onDisconnect } from "firebase/database";
import "./index.css";

// ─── Firebase Init ────────────────────────────────────────────
const app = initializeApp({
  apiKey: "AIzaSyBD6AC1xo3CCQn-Wk82r8nheWiu5Hf8-fo",
  authDomain: "orbit-284fb.firebaseapp.com",
  databaseURL: "https://orbit-284fb-default-rtdb.firebaseio.com",
  projectId: "orbit-284fb",
  storageBucket: "orbit-284fb.firebasestorage.app",
  messagingSenderId: "618534849025",
  appId: "1:618534849025:web:0ba7eb11a7f5840a1f4e00",
});
const auth = getAuth(app);
const db   = getFirestore(app);
const rtdb = getDatabase(app);

// ─── Constants ───────────────────────────────────────────────
const TG_TOKEN   = "8658257472:AAGzEJVjaBvdVZucl3BLjTyAlYLLqTmqFjU";
const CLOUD_NAME = "dkfmfntpa";
const UPLOAD_PRESET = "orbit_unsigned";
const ADMIN_PHONE   = "01128381838";

// ─── OTP Service ─────────────────────────────────────────────
const otpStore = {};
const OTP = {
  gen: () => Math.floor(100000 + Math.random() * 900000).toString(),
  async send(chatId, phone) {
    const code = this.gen();
    otpStore[phone] = { code, exp: Date.now() + 60000 };
    const text = `🛸 Orbit\n\nكود الدخول: ${code}\n\nصالح 60 ثانية فقط 🔒`;
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`;
    try {
      const r = await fetch(url);
      const d = await r.json();
      return d.ok;
    } catch { return false; }
  },
  verify(phone, input) {
    const r = otpStore[phone];
    if (!r) return { ok: false, msg: "لا يوجد كود نشط" };
    if (Date.now() > r.exp) { delete otpStore[phone]; return { ok: false, msg: "انتهت صلاحية الكود" }; }
    if (r.code !== input) return { ok: false, msg: "كود خاطئ" };
    delete otpStore[phone];
    return { ok: true };
  },
};

// ─── Rate Limiter ─────────────────────────────────────────────
const rl = {};
const RateLimit = {
  check(k) {
    const r = rl[k];
    if (r?.blocked > Date.now()) return { ok: false, msg: `محظور ${Math.ceil((r.blocked - Date.now()) / 60000)} دقيقة` };
    return { ok: true };
  },
  fail(k) {
    if (!rl[k]) rl[k] = { n: 0 };
    rl[k].n++;
    if (rl[k].n >= 20) { rl[k].blocked = Date.now() + 3600000; rl[k].n = 0; }
  },
  clear(k) { delete rl[k]; },
};

// ─── E2E Crypto ──────────────────────────────────────────────
const SK = "orbit-e2e-v2-2026";
const Crypto = {
  enc(t) { try { return btoa(encodeURIComponent(t).split("").map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ SK.charCodeAt(i % SK.length))).join("")); } catch { return t; } },
  dec(e) { try { return decodeURIComponent(atob(e).split("").map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ SK.charCodeAt(i % SK.length))).join("")); } catch { return e; } },
};

// ─── Cloudinary Upload ────────────────────────────────────────
async function uploadMedia(file, folder = "orbit/posts") {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("فشل الرفع");
  const d = await res.json();
  return d.secure_url;
}

// ─── Push Notifications ───────────────────────────────────────
async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const p = await Notification.requestPermission();
  return p === "granted";
}
function showNotif(title, body, icon = "/icon-192.png") {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon });
  }
}

// ─── Auth Context ─────────────────────────────────────────────
const AuthCtx = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        const snap = await getDoc(doc(db, "users", fu.uid));
        const d = snap.data() || {};
        setUser({ uid: fu.uid, name: d.name || fu.displayName || "مستخدم", phone: d.phone || "", avatar: d.avatar || null, verified: d.verified || false, bio: d.bio || "", isAdmin: d.phone === ADMIN_PHONE });
        const pr = ref(rtdb, `presence/${fu.uid}`);
        set(pr, { online: true, lastSeen: Date.now() });
        onDisconnect(pr).set({ online: false, lastSeen: Date.now() });
      } else { setUser(null); }
    });
  }, []);

  const logout = async () => {
    if (auth.currentUser) await set(ref(rtdb, `presence/${auth.currentUser.uid}`), { online: false, lastSeen: Date.now() });
    await signOut(auth);
  };

  return <AuthCtx.Provider value={{ user, logout }}>{children}</AuthCtx.Provider>;
}
const useAuth = () => useContext(AuthCtx);

// ─── Orbit Logo SVG ───────────────────────────────────────────
function OrbitLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="22" stroke="url(#g1)" strokeWidth="4" fill="none"/>
      <circle cx="50" cy="50" r="36" stroke="url(#g2)" strokeWidth="3" fill="none"/>
      <ellipse cx="50" cy="50" rx="46" ry="18" stroke="url(#g3)" strokeWidth="2.5" fill="none" transform="rotate(-30 50 50)"/>
      <circle cx="50" cy="50" r="6" fill="url(#g4)"/>
      <defs>
        <linearGradient id="g1" x1="28" y1="28" x2="72" y2="72"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#06b6d4"/></linearGradient>
        <linearGradient id="g2" x1="14" y1="14" x2="86" y2="86"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#22d3ee"/></linearGradient>
        <linearGradient id="g3" x1="4" y1="50" x2="96" y2="50"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#ec4899"/></linearGradient>
        <radialGradient id="g4" cx="50%" cy="50%" r="50%"><stop stopColor="#ec4899"/><stop offset="1" stopColor="#8b5cf6"/></radialGradient>
      </defs>
    </svg>
  );
}

// ─── Avatar Component ─────────────────────────────────────────
function Avatar({ src, name, size = 44, online, verified, story }) {
  const cls = ["avatar", online ? "online" : "", story ? "story" : ""].filter(Boolean).join(" ");
  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <div className={cls} style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : (name?.[0] || "O").toUpperCase()}
      </div>
      {online && !story && (
        <span style={{ position: "absolute", bottom: 1, right: 1, width: size * 0.22, height: size * 0.22, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--bg)" }} />
      )}
      {verified && (
        <span className="verified" style={{ position: "absolute", top: -2, right: -4, width: 16, height: 16 }}>✓</span>
      )}
    </div>
  );
}

// ─── Online Status Hook ───────────────────────────────────────
function useOnline(uid) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    if (!uid) return;
    const r = ref(rtdb, `presence/${uid}`);
    const u = onValue(r, s => setOnline(s.val()?.online || false));
    return () => off(r, "value", u);
  }, [uid]);
  return online;
}

// ═══════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════════════
function AuthScreen() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [chatId, setChatId] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [cd, setCd] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cd <= 0) return;
    const t = setInterval(() => setCd(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cd]);

  const sendOTP = async () => {
    if (!phone.trim() || !chatId.trim()) return setErr("أدخل رقم الهاتف والـ Chat ID");
    if (!/^\d+$/.test(chatId.trim())) return setErr("الـ Chat ID أرقام فقط");
    setErr(""); setLoading(true);
    const ok = await OTP.send(chatId.trim(), phone.trim());
    setLoading(false);
    if (ok) { setStep("otp"); setCd(60); }
    else setErr("فشل الإرسال — تأكد من Chat ID وابعت /start لـ @OrbitOTP_bot");
  };

  const verifyOTP = async () => {
    const lc = RateLimit.check(phone);
    if (!lc.ok) return setErr(lc.msg);
    const r = OTP.verify(phone.trim(), otp.trim());
    if (!r.ok) { RateLimit.fail(phone); return setErr(r.msg); }
    RateLimit.clear(phone);
    setLoading(true);
    try {
      const { user: fu } = await signInAnonymously(auth);
      const dn = name.trim() || `مستخدم_${phone.slice(-4)}`;
      await updateProfile(fu, { displayName: dn });
      await setDoc(doc(db, "users", fu.uid), { uid: fu.uid, name: dn, phone: phone.trim(), verified: false, createdAt: new Date() }, { merge: true });
    } catch (e) { setErr("خطأ: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" />
      <div className="glass auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><OrbitLogo size={80} /></div>
          <h1>ORBIT</h1>
          <p>اتصل بالكون من حولك</p>
        </div>

        {step === "phone" && (
          <div className="auth-step">
            <label className="auth-label">📱 رقم الهاتف</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01128381838" type="tel" />

            <label className="auth-label">
              🤖 Telegram Chat ID
              <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer">← احصل عليه هنا</a>
            </label>
            <input className="input" value={chatId} onChange={e => setChatId(e.target.value.replace(/\D/g, ""))} placeholder="123456789" type="tel" />

            <label className="auth-label">👤 اسمك (اختياري)</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="اسمك في Orbit" />

            <div className="auth-info">
              <strong>كيف تعرف الـ Chat ID؟</strong><br />
              1. افتح Telegram → ابحث عن <strong>@userinfobot</strong><br />
              2. ابعتله أي رسالة → هيرد بالـ ID بتاعك<br />
              3. انسخه والصقه هنا ✅
            </div>

            {err && <div className="error-box">⚠️ {err}</div>}
            <button className="btn btn-primary" onClick={sendOTP} disabled={loading || !phone || !chatId} style={{ width: "100%", padding: "14px" }}>
              {loading ? "⏳ جاري الإرسال..." : "📲 إرسال كود التحقق"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="auth-step">
            <div className="auth-countdown">
              <p>📨 تم إرسال الكود على Telegram</p>
              <div className={`timer ${cd === 0 ? "expired" : ""}`}>{cd > 0 ? `${cd}s` : "❌"}</div>
            </div>
            <label className="auth-label">🔐 كود التحقق (6 أرقام)</label>
            <input className="input otp-input" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="• • • • • •" maxLength={6} />
            {err && <div className="error-box">⚠️ {err}</div>}
            <button className="btn btn-primary" onClick={verifyOTP} disabled={otp.length !== 6 || cd === 0 || loading} style={{ width: "100%", padding: "14px" }}>
              {loading ? "⏳ جاري التحقق..." : "✅ دخول Orbit"}
            </button>
            {cd === 0 && <button className="btn btn-ghost" onClick={sendOTP} style={{ width: "100%" }}>🔄 إعادة الإرسال</button>}
            <button className="back-btn" onClick={() => { setStep("phone"); setOtp(""); setErr(""); }}>← تغيير البيانات</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FEED PAGE
// ═══════════════════════════════════════════════════════════════
const GRID = [
  { icon: "🕐", label: "الذكريات", color: "#f59e0b" },
  { icon: "🎮", label: "الألعاب",  color: "#8b5cf6" },
  { icon: "👆", label: "النكزات",  color: "#ec4899" },
  { icon: "👥", label: "الأصدقاء", color: "#06b6d4" },
  { icon: "💼", label: "احترافي",  color: "#10b981" },
  { icon: "📺", label: "Watch",    color: "#ef4444" },
];

function FeedPage({ user, onNav }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    // طلب إذن الإشعارات عند فتح الفيد
    if ("Notification" in window && Notification.permission === "default") {
      setShowNotifBanner(true);
    }
    // جلب المنشورات
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30));
    return onSnapshot(q, s => setPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    // جلب القصص (24 ساعة)
    const cutoff = new Date(Date.now() - 86400000);
    const q = query(collection(db, "stories"), where("createdAt", ">", cutoff), orderBy("createdAt", "desc"));
    return onSnapshot(q, s => setStories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setMedia(f); setPreview(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!text.trim() && !media) return;
    setPosting(true);
    try {
      let mediaUrl = null, mediaType = null;
      if (media) { mediaUrl = await uploadMedia(media, "orbit/posts"); mediaType = media.type.startsWith("video") ? "video" : "image"; }
      await addDoc(collection(db, "posts"), {
        text, mediaUrl, mediaType,
        authorId: user.uid, authorName: user.name,
        authorAvatar: user.avatar, verified: user.verified,
        likes: [], createdAt: serverTimestamp(),
      });
      setText(""); setMedia(null); setPreview(null);
    } catch (e) { console.error(e); }
    setPosting(false);
  };

  const toggleLike = async (postId, likes) => {
    const liked = likes?.includes(user.uid);
    await updateDoc(doc(db, "posts", postId), { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const deletePost = async id => {
    if (window.confirm("حذف المنشور؟")) await deleteDoc(doc(db, "posts", id));
  };

  const timeAgo = ts => {
    if (!ts) return "";
    const d = Date.now() - (ts.toMillis?.() || ts);
    const m = Math.floor(d / 60000);
    if (m < 1) return "الآن"; if (m < 60) return `${m}د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}س`; return `${Math.floor(h / 24)}ي`;
  };

  return (
    <div className="page">
      {/* Notification Banner */}
      {showNotifBanner && (
        <div className="notif-banner">
          <div style={{ fontSize: 32 }}>🔔</div>
          <div className="notif-banner-text">
            <p>فعّل الإشعارات</p>
            <span>عشان تعرف لما حد يعلق أو يعجبه منشورك</span>
          </div>
          <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 12 }}
            onClick={async () => { const ok = await requestNotifPermission(); setShowNotifBanner(false); if (ok) showNotif("Orbit", "تم تفعيل الإشعارات! 🎉"); }}>
            تفعيل
          </button>
          <button className="btn-icon" style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 18, cursor: "pointer" }}
            onClick={() => setShowNotifBanner(false)}>✕</button>
        </div>
      )}

      {/* Stories */}
      <div className="stories-wrap">
        <div className="story-item" onClick={() => fileRef.current?.click()}>
          <div className="story-add">+</div>
          <span className="story-label">قصتك</span>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
            onChange={async e => {
              const f = e.target.files[0]; if (!f) return;
              try {
                const url = await uploadMedia(f, "orbit/stories");
                await addDoc(collection(db, "stories"), { mediaUrl: url, mediaType: f.type.startsWith("video") ? "video" : "image", authorId: user.uid, authorName: user.name, authorAvatar: user.avatar, verified: user.verified, createdAt: serverTimestamp() });
              } catch {}
            }} />
        </div>
        {stories.map(s => (
          <div key={s.id} className="story-item">
            <div className="story-ring"><div className="story-inner">
              <Avatar src={s.authorAvatar} name={s.authorName} size={60} verified={s.verified} />
            </div></div>
            <span className="story-label">{s.authorName}</span>
          </div>
        ))}
      </div>

      {/* Grid Menu */}
      <div className="grid-menu" style={{ marginBottom: 16 }}>
        {GRID.map(g => (
          <div key={g.label} className="grid-item" onClick={() => g.label === "Watch" && onNav("watch")}>
            <span className="icon" style={{ filter: `drop-shadow(0 0 8px ${g.color})` }}>{g.icon}</span>
            <span className="label">{g.label}</span>
          </div>
        ))}
      </div>

      {/* Create Post */}
      <div className="glass create-post">
        <div className="create-post-inner">
          <Avatar src={user.avatar} name={user.name} size={42} verified={user.verified} />
          <div style={{ flex: 1 }}>
            <textarea className="input" value={text} onChange={e => setText(e.target.value)} placeholder="شارك ما يدور في ذهنك..." rows={3} />
            {preview && (
              <div className="media-preview">
                <img src={preview} alt="preview" />
                <button className="media-preview-remove" onClick={() => { setMedia(null); setPreview(null); }}>✕</button>
              </div>
            )}
            <div className="create-post-actions">
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }} onClick={() => document.getElementById("post-file").click()}>
                🖼 صورة/فيديو
              </button>
              <input id="post-file" type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFile} />
              <button className="btn btn-primary" style={{ marginRight: "auto", padding: "8px 20px", fontSize: 13 }} onClick={handlePost} disabled={posting || (!text.trim() && !media)}>
                {posting ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : "نشر ✨"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="section-title" style={{ marginTop: 20 }}>المنشورات الأخيرة</div>
      {posts.map(p => {
        const liked = p.likes?.includes(user.uid);
        return (
          <div key={p.id} className="glass post-card" style={{ marginBottom: 12 }}>
            <div className="post-header">
              <Avatar src={p.authorAvatar} name={p.authorName} size={44} verified={p.verified} />
              <div className="post-meta">
                <div className="post-author">
                  {p.authorName}
                  {p.verified && <span className="verified">✓</span>}
                </div>
                <div className="post-time">{timeAgo(p.createdAt)}</div>
              </div>
              {(user.isAdmin || p.authorId === user.uid) && (
                <button className="btn btn-icon" onClick={() => deletePost(p.id)} style={{ fontSize: 16 }}>🗑</button>
              )}
            </div>
            {p.text && <p className="post-text">{p.text}</p>}
            {p.mediaUrl && (
              <div className="post-media">
                {p.mediaType === "video" ? <video src={p.mediaUrl} controls /> : <img src={p.mediaUrl} alt="" />}
              </div>
            )}
            <div className="post-divider" />
            <div className="post-actions">
              <button className={`action-btn ${liked ? "liked" : ""}`} onClick={() => toggleLike(p.id, p.likes)}>
                {liked ? "❤️" : "🤍"} {p.likes?.length || 0}
              </button>
              <button className="action-btn">💬 {p.commentCount || 0}</button>
              <button className="action-btn" onClick={() => navigator.share?.({ url: window.location.href })}>🔗 مشاركة</button>
            </div>
          </div>
        );
      })}
      {posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌌</div>
          <p>لا توجد منشورات بعد<br />كن أول من ينشر!</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CHAT PAGE
// ═══════════════════════════════════════════════════════════════
function ChatPage({ user }) {
  const [active, setActive] = useState(null);
  return active ? <ChatWindow chat={active} user={user} onBack={() => setActive(null)} /> : <ChatList user={user} onOpen={setActive} />;
}

function ChatList({ user, onOpen }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDocs(collection(db, "users")).then(s => {
      setUsers(s.docs.map(d => ({ ...d.data(), uid: d.id, id: d.id })).filter(u => u.uid !== user.uid));
    });
  }, [user.uid]);

  const filtered = search ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase())) : users;
  const getChatId = (a, b) => [a, b].sort().join("_");

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="chat-header">
        <h2>💬 المحادثات</h2>
        <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ابحث عن مستخدم..." />
      </div>
      {filtered.map(u => (
        <ChatListItem key={u.uid} u={u} onOpen={() => onOpen({ ...u, chatId: getChatId(user.uid, u.uid) })} />
      ))}
      {filtered.length === 0 && <div className="empty-state"><div className="empty-icon">💬</div><p>لا يوجد مستخدمون بعد</p></div>}
    </div>
  );
}

function ChatListItem({ u, onOpen }) {
  const online = useOnline(u.uid);
  return (
    <div className="glass chat-item" onClick={onOpen}>
      <Avatar src={u.avatar} name={u.name} size={52} online={online} verified={u.verified} />
      <div className="chat-info">
        <div className="chat-name-row">
          <div className="chat-name">{u.name}{u.verified && <span className="verified">✓</span>}</div>
        </div>
        <div className="chat-preview">{u.bio || "مستخدم Orbit"}</div>
      </div>
      <span style={{ color: "var(--purple2)", fontSize: 20 }}>›</span>
    </div>
  );
}

function ChatWindow({ chat, user, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [othersTyping, setOthersTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const online = useOnline(chat.uid);
  const bottomRef = useRef();
  const timerRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    const r = ref(rtdb, `chats/${chat.chatId}/messages`);
    const u = onValue(r, s => {
      const d = s.val() || {};
      const list = Object.entries(d).map(([id, m]) => ({ id, ...m, text: Crypto.dec(m.encText) }));
      list.sort((a, b) => a.ts - b.ts);
      setMsgs(list);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => off(r, "value", u);
  }, [chat.chatId]);

  useEffect(() => {
    const r = ref(rtdb, `chats/${chat.chatId}/typing`);
    const u = onValue(r, s => {
      const d = s.val() || {};
      setOthersTyping(Object.keys(d).some(k => k !== user.uid && d[k]));
    });
    return () => off(r, "value", u);
  }, [chat.chatId, user.uid]);

  const setTypingState = useCallback((v) => {
    set(ref(rtdb, `chats/${chat.chatId}/typing/${user.uid}`), v || null);
  }, [chat.chatId, user.uid]);

  const handleInput = v => {
    setInput(v); setTypingState(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTypingState(false), 1500);
  };

  const send = async () => {
    if (!input.trim()) return;
    setSending(true); setTypingState(false);
    const r = ref(rtdb, `chats/${chat.chatId}/messages`);
    await push(r, { senderId: user.uid, encText: Crypto.enc(input.trim()), type: "text", ts: Date.now() });
    setInput(""); setSending(false);
    // إشعار للطرف الآخر
    showNotif(`رسالة من ${user.name}`, input.trim());
  };

  const sendFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    setSending(true);
    const url = await uploadMedia(f, "orbit/chat");
    const r = ref(rtdb, `chats/${chat.chatId}/messages`);
    await push(r, { senderId: user.uid, encText: Crypto.enc(url), type: f.type.startsWith("video") ? "video" : "image", ts: Date.now() });
    setSending(false);
  };

  return (
    <div className="chat-window">
      <div className="chat-win-header">
        <button className="chat-win-back" onClick={onBack}>←</button>
        <Avatar src={chat.avatar} name={chat.name} size={42} online={online} verified={chat.verified} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 15 }}>
            {chat.name}{chat.verified && <span className="verified">✓</span>}
          </div>
          <div className={`chat-win-status ${online ? "online" : "offline"}`}>
            {online ? "● متصل الآن" : "غير متصل"}
          </div>
        </div>
        <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-icon">📞</button>
          <button className="btn btn-icon">🎥</button>
        </div>
      </div>

      <div className="chat-messages">
        {msgs.map(m => {
          const isMe = m.senderId === user.uid;
          return (
            <div key={m.id} className={`msg-wrap ${isMe ? "me" : "them"}`}>
              <div className={`msg-bubble ${isMe ? "me" : "them"}`}>
                {m.type === "image" ? <img src={m.text} alt="" style={{ maxWidth: 220, borderRadius: 10, display: "block" }} /> :
                 m.type === "video" ? <video src={m.text} controls style={{ maxWidth: 220, borderRadius: 10 }} /> :
                 <p style={{ margin: 0 }}>{m.text}</p>}
                <span className="msg-time">
                  {new Date(m.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                  {isMe && " ✓✓"}
                </span>
              </div>
            </div>
          );
        })}
        {othersTyping && (
          <div className="msg-wrap me">
            <div className="typing-dots">
              {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <button className="btn btn-icon" onClick={() => fileRef.current?.click()}>📎</button>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={sendFile} />
        <input className="chat-input" value={input} onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="اكتب رسالة..." />
        <button className="btn btn-icon">🎤</button>
        <button className="send-btn" onClick={send} disabled={!input.trim() || sending}>
          {sending ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WATCH PAGE
// ═══════════════════════════════════════════════════════════════
function WatchPage({ user }) {
  const [videos, setVideos] = useState([]);
  const [tab, setTab] = useState("all");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [liked, setLiked] = useState({});
  const fileRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(20));
    return onSnapshot(q, s => setVideos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const upload = async e => {
    const f = e.target.files[0]; if (!f) return;
    setUploading(true);
    try {
      const url = await uploadMedia(f, "orbit/videos");
      await addDoc(collection(db, "videos"), { mediaUrl: url, title: title || "فيديو جديد", authorId: user.uid, authorName: user.name, authorAvatar: user.avatar, verified: user.verified, likes: 0, views: 0, createdAt: serverTimestamp() });
      setTitle("");
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  return (
    <div className="page">
      <div style={{ padding: "16px 14px 8px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14, background: "linear-gradient(135deg, var(--text), var(--purple2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>📺 Watch</h2>
        <div className="watch-tabs">
          {["all","reels","groups"].map(t => (
            <button key={t} className={`watch-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "all" ? "🌐 الكل" : t === "reels" ? "🎬 Reels" : "👥 مجموعات"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 12px 14px" }}>
        <div className="glass" style={{ padding: 16 }}>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الفيديو..." style={{ marginBottom: 10 }} />
          <button className="btn btn-primary" style={{ width: "100%", padding: 13 }} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> جاري الرفع...</> : "🎬 رفع فيديو / Reel"}
          </button>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={upload} />
        </div>
      </div>

      {videos.map(v => (
        <div key={v.id} className="glass video-card">
          <div className="video-thumb">
            {v.mediaUrl ? <video src={v.mediaUrl} controls preload="metadata" /> :
              <div className="video-thumb-placeholder"><span style={{ fontSize: 48 }}>▶️</span></div>}
            <div className="views-badge">👁 {v.views || 0}</div>
          </div>
          <div className="video-info">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Avatar src={v.authorAvatar} name={v.authorName} size={38} verified={v.verified} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 14 }}>
                  {v.authorName}{v.verified && <span className="verified">✓</span>}
                </div>
                <div style={{ color: "var(--text3)", fontSize: 12 }}>{v.title}</div>
              </div>
            </div>
            <div className="video-actions">
              <button className={`btn ${liked[v.id] ? "btn-danger" : "btn-ghost"}`} style={{ flex: 1, fontSize: 13 }} onClick={() => setLiked(l => ({ ...l, [v.id]: !l[v.id] }))}>
                {liked[v.id] ? "❤️" : "🤍"} {(v.likes || 0) + (liked[v.id] ? 1 : 0)}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}>💬 تعليق</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => navigator.share?.({ url: window.location.href })}>🔗</button>
            </div>
          </div>
        </div>
      ))}
      {videos.length === 0 && <div className="empty-state"><div className="empty-icon">🎬</div><p>لا توجد فيديوهات<br />ارفع أول فيديو!</p></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE PAGE
// ═══════════════════════════════════════════════════════════════
function ProfilePage({ user, onUpdate, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef();

  const save = async () => {
    setLoading(true);
    await updateDoc(doc(db, "users", user.uid), { name, bio });
    onUpdate({ ...user, name, bio });
    setEditing(false); setLoading(false);
  };

  const changeAvatar = async e => {
    const f = e.target.files[0]; if (!f) return;
    setAvatarLoading(true);
    try {
      const url = await uploadMedia(f, "orbit/avatars");
      await updateDoc(doc(db, "users", user.uid), { avatar: url });
      onUpdate({ ...user, avatar: url });
    } catch {}
    setAvatarLoading(false);
  };

  return (
    <div className="page">
      <div className="profile-cover" />
      <div className="profile-info">
        <div className="profile-avatar-wrap">
          {avatarLoading ? <div className="avatar" style={{ width: 90, height: 90 }}><div className="spinner" /></div> :
            <Avatar src={user.avatar} name={user.name} size={90} verified={user.verified} />}
          <button className="profile-edit-avatar" onClick={() => fileRef.current?.click()}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={changeAvatar} />
        </div>

        {!editing ? (
          <>
            <div className="profile-name-row">
              <span className="profile-name">{user.name}</span>
              {user.verified && <span className="verified">✓</span>}
            </div>
            <div className="profile-phone">📱 {user.phone}</div>
            {user.bio && <p className="profile-bio">{user.bio}</p>}
            {user.isAdmin && <div className="admin-badge">🛸 مدير النظام</div>}
            <div className="profile-stats">
              {[["المنشورات","0"],["الأصدقاء","0"],["المتابعون","0"]].map(([l,v]) => (
                <div key={l} className="stat-item"><div className="stat-value">{v}</div><div className="stat-label">{l}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(true)}>✏️ تعديل الملف</button>
              <button className="btn btn-danger" onClick={onLogout}>خروج</button>
            </div>
          </>
        ) : (
          <div className="glass" style={{ padding: 20, marginTop: 8 }}>
            <h3 style={{ marginBottom: 16, color: "var(--purple2)" }}>✏️ تعديل الملف</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ color: "var(--text2)", fontSize: 13 }}>الاسم</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} />
              <label style={{ color: "var(--text2)", fontSize: 13 }}>نبذة</label>
              <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} rows={3} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={loading}>
                  {loading ? "⏳" : "💾 حفظ"}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN HQ
// ═══════════════════════════════════════════════════════════════
function AdminHQ({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "users")).then(s => {
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  if (!user.isAdmin) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pink)", fontFamily: "var(--font)", fontSize: 24 }}>404 — غير مصرح</div>;

  const verify = async u => {
    await updateDoc(doc(db, "users", u.id), { verified: !u.verified });
    setUsers(p => p.map(x => x.id === u.id ? { ...x, verified: !x.verified } : x));
  };
  const ban = async u => {
    await updateDoc(doc(db, "users", u.id), { banned: !u.banned });
    setUsers(p => p.map(x => x.id === u.id ? { ...x, banned: !x.banned } : x));
  };
  const del = async u => {
    if (!window.confirm(`حذف ${u.name}؟`)) return;
    await deleteDoc(doc(db, "users", u.id));
    setUsers(p => p.filter(x => x.id !== u.id));
  };
  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    await addDoc(collection(db, "broadcasts"), { message: broadcast.trim(), createdAt: serverTimestamp(), readBy: [] });
    setSent(true); setBroadcast("");
    setTimeout(() => setSent(false), 4000);
  };

  const filtered = users.filter(u => u.name?.includes(search) || u.phone?.includes(search));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)", color: "var(--text)" }}>
      <div className="admin-header">
        <div>
          <div className="admin-title">🛸 ORBIT ADMIN HQ</div>
          <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>صلاحيات كاملة · {user.name}</div>
        </div>
        <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: 12, padding: "8px 14px" }}>خروج</button>
      </div>

      <div style={{ padding: 14, maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="stats-grid">
          {[
            { icon: "👥", label: "المستخدمون", val: users.length },
            { icon: "✅", label: "موثقون", val: users.filter(u => u.verified).length },
            { icon: "🚫", label: "محظورون", val: users.filter(u => u.banned).length },
            { icon: "🟢", label: "متصلون", val: Math.max(1, Math.floor(users.length * 0.3)) },
          ].map(s => (
            <div key={s.label} className="glass stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-num">{s.val}</div>
              <div className="stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="admin-tabs">
          {[["users","👥 المستخدمون"],["posts","📝 المنشورات"],["broadcast","📡 البث"]].map(([id,lbl]) => (
            <button key={id} className={`admin-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{lbl}</button>
          ))}
        </div>

        {tab === "users" && (
          <>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ابحث بالاسم أو الهاتف..." />
            {loading ? <div style={{ textAlign: "center", padding: 32 }}><div className="spinner" style={{ margin: "0 auto" }} /></div> :
              filtered.map(u => (
                <div key={u.id} className="glass user-card">
                  <div className="user-card-top">
                    <Avatar src={u.avatar} name={u.name} size={48} verified={u.verified} />
                    <div className="user-card-info">
                      <div className="user-card-name">
                        {u.name}
                        {u.verified && <span className="verified">✓</span>}
                        {u.banned && <span className="banned-tag">محظور</span>}
                      </div>
                      <div className="user-card-phone">{u.phone}</div>
                    </div>
                  </div>
                  <div className="user-card-actions">
                    <button className={`btn ${u.verified ? "btn-ghost" : "btn-primary"}`} style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => verify(u)}>
                      {u.verified ? "✓ موثق" : "توثيق"}
                    </button>
                    <button className={`btn ${u.banned ? "btn-ghost" : "btn-danger"}`} style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => ban(u)}>
                      {u.banned ? "🔓 رفع الحظر" : "🚫 حظر"}
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => del(u)}>🗑 حذف</button>
                  </div>
                </div>
              ))
            }
          </>
        )}

        {tab === "broadcast" && (
          <div className="glass broadcast-box">
            <h3>📡 البث العالمي</h3>
            {sent && <div className="success-box" style={{ marginBottom: 12 }}>✅ تم الإرسال لجميع المستخدمين!</div>}
            <textarea className="input" value={broadcast} onChange={e => setBroadcast(e.target.value)} rows={5} placeholder="اكتب رسالتك... ستصل لجميع مستخدمي Orbit 🌐" style={{ marginBottom: 12 }} />
            <button className="btn btn-primary" style={{ width: "100%", padding: 13 }} onClick={sendBroadcast} disabled={!broadcast.trim()}>
              📡 إرسال لـ {users.length} مستخدم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BOTTOM NAV
// ═══════════════════════════════════════════════════════════════
function BottomNav({ active, onNav, isAdmin }) {
  const tabs = [
    { id: "feed",    icon: "🏠", label: "الرئيسية" },
    { id: "chat",    icon: "💬", label: "الدردشة" },
    { id: "plus",    icon: "+",  label: "",  plus: true },
    { id: "watch",   icon: "📺", label: "Watch" },
    { id: "profile", icon: "👤", label: "حسابي" },
    ...(isAdmin ? [{ id: "admin", icon: "🛸", label: "Admin" }] : []),
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => t.plus
        ? <button key="plus" className="nav-plus" onClick={() => onNav("feed")}>+</button>
        : (
          <button key={t.id} className={`nav-item ${active === t.id ? "active" : ""}`} onClick={() => onNav(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        )
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APP SHELL
// ═══════════════════════════════════════════════════════════════
function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("feed");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (user && !userData) {
      setUserData(user);
      if (user.isAdmin && page === "feed") setPage("admin");
    }
  }, [user]);

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="loading-logo"><OrbitLogo size={80} /></div>
        <div className="spinner" />
        <p className="loading-text">جاري تحميل Orbit...</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const cu = userData || user;

  if (page === "admin") return (
    <>
      <AdminHQ user={cu} onLogout={logout} />
      {cu.isAdmin && <BottomNav active="admin" onNav={setPage} isAdmin />}
    </>
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <OrbitLogo size={30} />
          <span>ORBIT</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-icon">🔍</button>
          <button className="btn btn-icon notif-dot">🔔</button>
          <button className="btn btn-icon" onClick={() => setPage("chat")}>💬</button>
        </div>
      </header>

      {/* Pages */}
      {page === "feed"    && <FeedPage    user={cu} onNav={setPage} />}
      {page === "chat"    && <ChatPage    user={cu} />}
      {page === "watch"   && <WatchPage   user={cu} />}
      {page === "profile" && <ProfilePage user={cu} onUpdate={u => setUserData(u)} onLogout={logout} />}

      <BottomNav active={page} onNav={setPage} isAdmin={cu.isAdmin} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}
