// components/Profile/index.jsx — صفحة الملف الشخصي

import { useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadMedia } from "../../lib/cloudinary";
import { T, GlassCard, Avatar, Button, Input, VerifiedBadge, Spinner } from "../Shared";

export default function ProfilePage({ user, onUpdate, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(user.name);
  const [bio, setBio]         = useState(user.bio || "");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef();

  const handleSave = async () => {
    setLoading(true);
    await updateDoc(doc(db, "users", user.uid), { name, bio });
    onUpdate?.({ ...user, name, bio });
    setEditing(false);
    setLoading(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const { url } = await uploadMedia(file, "orbit/avatars");
      await updateDoc(doc(db, "users", user.uid), { avatar: url });
      onUpdate?.({ ...user, avatar: url });
    } catch (e) { console.error(e); }
    setAvatarLoading(false);
  };

  const STATS = [
    { label: "المنشورات", value: 0 },
    { label: "الأصدقاء", value: 0 },
    { label: "المتابعون", value: 0 },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Cover */}
      <div style={{
        height: 140,
        background: `linear-gradient(135deg, ${T.purple}, ${T.cyan}40)`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,245,255,0.03) 10px, rgba(0,245,255,0.03) 20px)`,
        }} />
      </div>

      {/* Avatar + Info */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ position: "relative", marginTop: -50, marginBottom: 16, display: "inline-block" }}>
          {avatarLoading ? (
            <div style={{
              width: 90, height: 90, borderRadius: "50%",
              background: T.bgCard, display: "flex",
              alignItems: "center", justifyContent: "center",
              border: `3px solid ${T.bg}`,
            }}>
              <Spinner size={30} />
            </div>
          ) : (
            <Avatar src={user.avatar} name={user.name} size={90} verified={user.verified} />
          )}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: "absolute", bottom: 2, left: 2,
              width: 28, height: 28, borderRadius: "50%",
              background: T.cyan, border: `2px solid ${T.bg}`,
              fontSize: 14, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >📷</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>

        {!editing ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <h2 style={{ margin: 0, color: T.textPrimary, fontSize: 22, fontWeight: 900 }}>{user.name}</h2>
              {user.verified && <VerifiedBadge size={18} />}
            </div>
            <p style={{ color: T.textMuted, fontSize: 13, margin: "0 0 6px" }}>📱 {user.phone}</p>
            {user.bio && <p style={{ color: T.textPrimary, fontSize: 14, margin: "0 0 16px" }}>{user.bio}</p>}
            {user.isAdmin && (
              <div style={{
                display: "inline-block",
                background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
                borderRadius: 20, padding: "4px 14px",
                color: T.bg, fontSize: 12, fontWeight: 800,
                marginBottom: 16, boxShadow: T.cyanGlow,
              }}>
                🛸 مدير النظام
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: "center",
                  borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
                  padding: "8px 0",
                }}>
                  <div style={{ color: T.textPrimary, fontWeight: 900, fontSize: 20 }}>{s.value}</div>
                  <div style={{ color: T.textMuted, fontSize: 12 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={() => setEditing(true)} full variant="ghost">✏️ تعديل الملف</Button>
              <Button onClick={onLogout} variant="danger" style={{ flex: 0.4 }}>خروج</Button>
            </div>
          </div>
        ) : (
          <GlassCard style={{ marginTop: 8 }}>
            <h3 style={{ color: T.cyan, margin: "0 0 14px" }}>✏️ تعديل الملف الشخصي</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ color: T.textMuted, fontSize: 13 }}>الاسم</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" />
              <label style={{ color: T.textMuted, fontSize: 13 }}>نبذة عنك</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="أخبر الناس عنك..."
                rows={3}
                style={{
                  width: "100%", background: T.bgGlass,
                  border: `1px solid ${T.border}`, borderRadius: 12,
                  color: T.textPrimary, padding: "10px 14px",
                  fontSize: 14, fontFamily: T.font,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={handleSave} disabled={loading} full>
                  {loading ? <Spinner size={16} /> : "💾 حفظ"}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>إلغاء</Button>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
