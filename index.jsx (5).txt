// components/Admin/index.jsx — لوحة التحكم الكاملة (Admin HQ)
// المسار السري: /orbit-admin-secret
// الوصول: رقم الهاتف 01128381838 فقط

import { useState, useEffect } from "react";
import {
  collection, getDocs, doc, updateDoc,
  deleteDoc, addDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { T, GlassCard, Avatar, Button, VerifiedBadge, Input, Spinner, ErrorMsg } from "../Shared";

// ─── Stats Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <GlassCard style={{
      textAlign: "center",
      borderColor: `${color}30`,
      padding: 16,
    }}>
      <div style={{ fontSize: 32, marginBottom: 6, filter: `drop-shadow(0 0 8px ${color})` }}>{icon}</div>
      <div style={{
        fontSize: 32, fontWeight: 900, color,
        textShadow: `0 0 15px ${color}`,
      }}>{value}</div>
      <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>{label}</div>
    </GlassCard>
  );
}

// ─── User Row ─────────────────────────────────────────────────
function UserRow({ user, onVerify, onDelete, onBan }) {
  return (
    <GlassCard style={{ padding: 14, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar src={user.avatar} name={user.name} size={48} verified={user.verified} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14 }}>{user.name}</span>
            {user.verified && <VerifiedBadge size={14} />}
            {user.banned && (
              <span style={{
                marginRight: 8, background: "rgba(255,45,120,0.2)",
                border: "1px solid rgba(255,45,120,0.4)",
                borderRadius: 6, padding: "1px 6px",
                color: T.pink, fontSize: 10,
              }}>محظور</span>
            )}
          </div>
          <span style={{ color: T.textMuted, fontSize: 12 }}>{user.phone}</span>
          <br />
          <span style={{ color: T.textMuted, fontSize: 11 }}>
            UID: {(user.uid || user.id)?.slice(0, 12)}...
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Button
          variant={user.verified ? "dark" : "cyan"}
          onClick={() => onVerify(user)}
          size="sm"
          style={{ flex: 1 }}
        >
          {user.verified ? "✓ موثق" : "توثيق ✓"}
        </Button>
        <Button
          variant={user.banned ? "green" : "ghost"}
          onClick={() => onBan(user)}
          size="sm"
          style={{ flex: 1 }}
        >
          {user.banned ? "🔓 رفع الحظر" : "🚫 حظر"}
        </Button>
        <Button
          variant="danger"
          onClick={() => onDelete(user)}
          size="sm"
          style={{ flex: 1 }}
        >
          🗑 حذف
        </Button>
      </div>
    </GlassCard>
  );
}

// ─── Broadcast Panel ──────────────────────────────────────────
function BroadcastPanel({ totalUsers }) {
  const [msg, setMsg]       = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    // حفظ الإشعار في Firestore — المستخدمون يقرؤونه في لوحة الإشعارات
    await addDoc(collection(db, "broadcasts"), {
      message: msg.trim(),
      createdAt: serverTimestamp(),
      readBy: [],
    });
    setSent(true);
    setMsg("");
    setLoading(false);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <GlassCard>
      <h3 style={{ color: T.cyan, margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
        📡 البث العالمي
      </h3>

      {sent && (
        <div style={{
          background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: 10, padding: "10px 14px", color: T.green,
          marginBottom: 12, fontSize: 13,
        }}>
          ✅ تم إرسال الإشعار لجميع مستخدمي Orbit ({totalUsers} مستخدم)
        </div>
      )}

      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="اكتب رسالتك هنا... ستصل لجميع مستخدمي Orbit فوراً 🌐"
        rows={5}
        style={{
          width: "100%", background: T.bgGlass,
          border: `1px solid ${T.border}`, borderRadius: 12,
          color: T.textPrimary, padding: "12px 14px",
          fontSize: 14, fontFamily: T.font,
          outline: "none", boxSizing: "border-box",
          marginBottom: 12,
        }}
      />

      <Button onClick={handleBroadcast} disabled={!msg.trim() || loading} full>
        {loading ? <Spinner size={16} /> : `📡 إرسال لـ ${totalUsers} مستخدم`}
      </Button>
    </GlassCard>
  );
}

// ─── Posts Management ─────────────────────────────────────────
function PostsManager() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"))).then((snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const deletePost = async (id) => {
    if (!window.confirm("حذف المنشور؟")) return;
    await deleteDoc(doc(db, "posts", id));
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {posts.map((p) => (
        <GlassCard key={p.id} style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
              <span style={{ color: T.cyan, fontSize: 13, fontWeight: 600 }}>{p.authorName}</span>
              <p style={{ color: T.textPrimary, fontSize: 13, margin: "4px 0 0", lineHeight: 1.5,
                overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>{p.text || "[ميديا]"}</p>
              <span style={{ color: T.textMuted, fontSize: 11 }}>
                👍 {p.likes?.length || 0} · 💬 {p.comments?.length || 0}
              </span>
            </div>
            <Button variant="danger" size="sm" onClick={() => deletePost(p.id)}>🗑</Button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── Admin HQ Main ────────────────────────────────────────────
export default function AdminHQ({ user, onLogout }) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab]       = useState("users");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleVerify = async (u) => {
    const ref = doc(db, "users", u.id);
    await updateDoc(ref, { verified: !u.verified });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, verified: !x.verified } : x));
  };

  const handleBan = async (u) => {
    const ref = doc(db, "users", u.id);
    await updateDoc(ref, { banned: !u.banned });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, banned: !x.banned } : x));
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`حذف حساب ${u.name}؟ لا يمكن التراجع!`)) return;
    await deleteDoc(doc(db, "users", u.id));
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const stats = [
    { icon: "👥", label: "المستخدمون", value: users.length, color: T.cyan },
    { icon: "✅", label: "موثقون", value: users.filter((u) => u.verified).length, color: T.green },
    { icon: "🚫", label: "محظورون", value: users.filter((u) => u.banned).length, color: T.pink },
    { icon: "🟢", label: "متصلون", value: Math.floor(users.length * 0.3), color: "#00ff88" },
  ];

  const TABS = [
    { id: "users", label: "👥 المستخدمون" },
    { id: "posts", label: "📝 المنشورات" },
    { id: "broadcast", label: "📡 البث" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.textPrimary }}>

      {/* Admin Header */}
      <div style={{
        background: T.bgCard,
        borderBottom: `2px solid ${T.cyan}`,
        boxShadow: `0 0 40px rgba(0,245,255,0.1)`,
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(20px)",
      }}>
        <div>
          <h1 style={{ margin: 0, color: T.cyan, fontSize: 18, fontWeight: 900, textShadow: T.cyanGlow, letterSpacing: 2 }}>
            🛸 ORBIT ADMIN HQ
          </h1>
          <p style={{ margin: 0, color: T.textMuted, fontSize: 11 }}>صلاحيات كاملة · {user.name}</p>
        </div>
        <Button variant="ghost" onClick={onLogout} size="sm">خروج</Button>
      </div>

      <div style={{ padding: 14, maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, background: T.bgCard, borderRadius: 12, padding: 6, border: `1px solid ${T.border}` }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "9px 6px",
                borderRadius: 8, border: "none",
                background: tab === t.id ? T.cyan : "transparent",
                color: tab === t.id ? T.bg : T.textMuted,
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                fontFamily: T.font,
                boxShadow: tab === t.id ? T.cyanGlow : "none",
                transition: "all 0.2s",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث بالاسم أو الهاتف..." />
            {loading
              ? <div style={{ textAlign: "center", padding: 32 }}><Spinner size={40} /></div>
              : filtered.map((u) => (
                  <UserRow key={u.id} user={u} onVerify={handleVerify} onBan={handleBan} onDelete={handleDelete} />
                ))
            }
          </>
        )}

        {/* Posts Tab */}
        {tab === "posts" && <PostsManager />}

        {/* Broadcast Tab */}
        {tab === "broadcast" && <BroadcastPanel totalUsers={users.length} />}
      </div>
    </div>
  );
}
