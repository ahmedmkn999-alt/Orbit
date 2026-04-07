// components/Watch/index.jsx — صفحة الفيديوهات والـ Reels

import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, orderBy, query, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { uploadMedia } from "../../lib/cloudinary";
import { T, GlassCard, Avatar, Button, Spinner, VerifiedBadge } from "../Shared";

function VideoCard({ video, uid }) {
  const [liked, setLiked] = useState(false);
  const videoRef = useRef();

  return (
    <GlassCard style={{ padding: 0, overflow: "hidden" }}>
      {/* Video */}
      <div style={{
        position: "relative",
        background: "#000",
        minHeight: 220,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {video.mediaUrl ? (
          <video
            ref={videoRef}
            src={video.mediaUrl}
            style={{ width: "100%", maxHeight: 360, objectFit: "contain" }}
            controls
            preload="metadata"
          />
        ) : (
          <div style={{
            height: 220, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${T.purple}30, ${T.cyan}20)`,
          }}>
            <span style={{ fontSize: 48 }}>▶️</span>
            <span style={{ color: T.textMuted, fontSize: 12 }}>فيديو</span>
          </div>
        )}

        {/* Views Badge */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(0,0,0,0.6)", borderRadius: 20,
          padding: "3px 10px", color: "#fff", fontSize: 12,
        }}>
          👁 {video.views || 0}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Avatar src={video.authorAvatar} name={video.authorName} size={38} verified={video.verified} />
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ color: T.textPrimary, fontWeight: 700, fontSize: 14 }}>{video.authorName}</span>
              {video.verified && <VerifiedBadge size={13} />}
            </div>
            {video.title && <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>{video.title}</p>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setLiked((l) => !l)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: liked ? "rgba(255,45,120,0.15)" : T.bgGlass,
              border: `1px solid ${liked ? T.pink : T.border}`,
              borderRadius: 10, padding: "8px",
              color: liked ? T.pink : T.textMuted,
              cursor: "pointer", fontFamily: T.font, fontSize: 13,
            }}
          >
            {liked ? "❤️" : "🤍"} {(video.likes || 0) + (liked ? 1 : 0)}
          </button>
          <button style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: T.bgGlass, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "8px",
            color: T.textMuted, cursor: "pointer", fontFamily: T.font, fontSize: 13,
          }}>
            💬 تعليق
          </button>
          <button
            onClick={() => navigator.share?.({ url: window.location.href })}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: T.bgGlass, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "8px",
              color: T.textMuted, cursor: "pointer", fontFamily: T.font, fontSize: 13,
            }}
          >
            🔗 مشاركة
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

export default function WatchPage({ user }) {
  const [videos, setVideos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle]       = useState("");
  const [tab, setTab]           = useState("all"); // all | reels | groups
  const fileRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadMedia(file, "orbit/videos");
      await addDoc(collection(db, "videos"), {
        mediaUrl: url,
        title: title || "فيديو جديد",
        authorId: user.uid,
        authorName: user.name,
        authorAvatar: user.avatar || null,
        verified: user.verified,
        likes: 0,
        views: 0,
        createdAt: serverTimestamp(),
      });
      setTitle("");
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  const TABS = [
    { id: "all", label: "🌐 الكل" },
    { id: "reels", label: "🎬 Reels" },
    { id: "groups", label: "👥 المجموعات" },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "16px 14px 12px" }}>
        <h2 style={{ margin: "0 0 14px", color: T.textPrimary, fontSize: 20 }}>📺 Watch</h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px", borderRadius: 20,
                border: `1px solid ${tab === t.id ? T.cyan : T.border}`,
                background: tab === t.id ? T.cyanDim : "transparent",
                color: tab === t.id ? T.cyan : T.textMuted,
                cursor: "pointer", fontFamily: T.font, fontSize: 13, fontWeight: 600,
                boxShadow: tab === t.id ? T.cyanGlow : "none",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Upload Box */}
      <div style={{ padding: "0 14px 14px" }}>
        <GlassCard>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الفيديو..."
            style={{
              width: "100%", background: T.bgGlass,
              border: `1px solid ${T.border}`, borderRadius: 10,
              color: T.textPrimary, padding: "10px 14px",
              fontSize: 14, fontFamily: T.font, outline: "none",
              marginBottom: 10, boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              width: "100%", padding: 12,
              background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
              border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: uploading ? "not-allowed" : "pointer",
              fontFamily: T.font, boxShadow: T.cyanGlow,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {uploading ? <><Spinner size={18} /> جاري الرفع...</> : "🎬 رفع فيديو / Reel"}
          </button>
          <input ref={fileRef} type="file" accept="video/*" onChange={handleUpload} style={{ display: "none" }} />
        </GlassCard>
      </div>

      {/* Videos */}
      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {loading && <div style={{ textAlign: "center", padding: 32 }}><Spinner size={40} /></div>}

        {videos.map((v) => <VideoCard key={v.id} video={v} uid={user.uid} />)}

        {!loading && videos.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <p>لا توجد فيديوهات — ارفع أول فيديو!</p>
          </div>
        )}
      </div>
    </div>
  );
}
