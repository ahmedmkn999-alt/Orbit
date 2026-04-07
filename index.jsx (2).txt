// components/Feed/index.jsx — الصفحة الرئيسية الكاملة

import { useState, useRef } from "react";
import { usePosts, useStories } from "../../hooks/usePosts";
import { T, GlassCard, Avatar, Button, VerifiedBadge, Input, Spinner, NeonDivider } from "../Shared";
import { uploadMedia } from "../../lib/cloudinary";

// ─── Stories Row ──────────────────────────────────────────────
function StoriesRow({ stories, user, onAddStory }) {
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) await onAddStory(file);
  };

  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{
        display: "flex", gap: 12,
        overflowX: "auto", paddingBottom: 8, paddingTop: 4,
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        {/* زر إضافة قصة */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}
        >
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            border: `2px dashed ${T.cyan}`, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 28, background: T.cyanDim,
            boxShadow: T.cyanGlow, transition: "all 0.2s",
          }}>+</div>
          <span style={{ color: T.textMuted, fontSize: 11 }}>قصتك</span>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
        </div>

        {/* القصص */}
        {stories.map((s) => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              padding: 3, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.cyan}, ${T.purple}, ${T.pink})`,
              boxShadow: T.cyanGlow, cursor: "pointer",
            }}>
              <div style={{ padding: 2, borderRadius: "50%", background: T.bg }}>
                <Avatar src={s.authorAvatar} name={s.authorName} size={60} verified={s.verified} />
              </div>
            </div>
            <span style={{ color: T.textMuted, fontSize: 11, maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.authorName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Grid Menu ────────────────────────────────────────────────
const GRID_ITEMS = [
  { icon: "🕐", label: "الذكريات",  color: "#ff9500", page: "memories" },
  { icon: "🎮", label: "الألعاب",   color: T.purple,  page: "games" },
  { icon: "👆", label: "النكزات",   color: T.pink,    page: "pokes" },
  { icon: "👥", label: "الأصدقاء",  color: T.cyan,    page: "friends" },
  { icon: "💼", label: "احترافي",   color: "#00ff88", page: "pro" },
  { icon: "📺", label: "Watch",     color: "#ff5252", page: "watch" },
];

function GridMenu({ onNavigate }) {
  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {GRID_ITEMS.map((item) => (
          <GlassCard
            key={item.label}
            onClick={() => onNavigate(item.page)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 8, padding: 16, cursor: "pointer",
              borderColor: `${item.color}25`,
              transition: "all 0.2s",
            }}
            className="orbit-card"
          >
            <span style={{ fontSize: 30, filter: `drop-shadow(0 0 10px ${item.color})` }}>
              {item.icon}
            </span>
            <span style={{ color: T.textPrimary, fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ─── Create Post ──────────────────────────────────────────────
function CreatePost({ user, onCreate }) {
  const [text, setText]       = useState("");
  const [media, setMedia]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setMedia(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!text.trim() && !media) return;
    setLoading(true);
    try {
      await onCreate({ text, mediaFile: media, authorId: user.uid, authorName: user.name, authorAvatar: user.avatar, verified: user.verified });
      setText(""); setMedia(null); setPreview(null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <GlassCard style={{ margin: "0 12px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar src={user.avatar} name={user.name} size={40} verified={user.verified} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شارك ما يدور في ذهنك..."
            rows={3}
            style={{
              width: "100%", background: T.bgGlass,
              border: `1px solid ${T.border}`, borderRadius: 12,
              color: T.textPrimary, padding: "10px 14px",
              fontSize: 14, fontFamily: T.font,
              resize: "none", outline: "none",
            }}
          />

          {preview && (
            <div style={{ position: "relative", marginTop: 8 }}>
              <img src={preview} alt="preview" style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" }} />
              <button
                onClick={() => { setMedia(null); setPreview(null); }}
                style={{
                  position: "absolute", top: 6, left: 6,
                  background: "rgba(0,0,0,0.6)", border: "none",
                  borderRadius: "50%", width: 28, height: 28,
                  color: "#fff", cursor: "pointer", fontSize: 14,
                }}
              >✕</button>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: T.cyanDim, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "6px 12px",
                color: T.cyan, cursor: "pointer", fontSize: 13, fontFamily: T.font,
              }}
            >
              🖼 صورة/فيديو
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
            <Button onClick={handlePost} disabled={loading || (!text.trim() && !media)} style={{ marginRight: "auto" }}>
              {loading ? <Spinner size={16} /> : "نشر ✨"}
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Post Card ────────────────────────────────────────────────
function PostCard({ post, uid, onLike, onDelete, isAdmin }) {
  const [showComments, setShowComments] = useState(false);
  const liked = post.likes?.includes(uid);
  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - ts.toMillis?.() || Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return `${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ساعة`;
    return `${Math.floor(h / 24)} يوم`;
  };

  return (
    <GlassCard style={{ margin: "0 12px", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar src={post.authorAvatar} name={post.authorName} size={44} verified={post.verified} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15 }}>{post.authorName}</span>
            {post.verified && <VerifiedBadge />}
          </div>
          <span style={{ color: T.textMuted, fontSize: 12 }}>{timeAgo(post.createdAt)}</span>
        </div>
        {(isAdmin || post.authorId === uid) && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ background: "none", border: "none", color: T.pink, cursor: "pointer", fontSize: 18 }}
          >🗑</button>
        )}
      </div>

      {/* Text */}
      {post.text && (
        <p style={{ color: T.textPrimary, fontSize: 15, lineHeight: 1.7, margin: "0 0 12px" }}>
          {post.text}
        </p>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <div style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden" }}>
          {post.mediaType === "video"
            ? <video src={post.mediaUrl} controls style={{ width: "100%", maxHeight: 320, objectFit: "cover" }} />
            : <img src={post.mediaUrl} alt="post" style={{ width: "100%", maxHeight: 400, objectFit: "cover" }} />
          }
        </div>
      )}

      <NeonDivider />

      {/* Actions */}
      <div style={{ display: "flex", gap: 4 }}>
        {[
          {
            icon: liked ? "❤️" : "🤍",
            label: `${post.likes?.length || 0}`,
            action: () => onLike(post.id, uid),
            active: liked,
          },
          {
            icon: "💬",
            label: `${post.comments?.length || 0}`,
            action: () => setShowComments((s) => !s),
          },
          { icon: "🔗", label: "مشاركة", action: () => navigator.share?.({ url: window.location.href }) },
        ].map((a) => (
          <button
            key={a.icon}
            onClick={a.action}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: a.active ? "rgba(255,45,120,0.1)" : "none",
              border: `1px solid ${a.active ? T.pink + "40" : "transparent"}`,
              borderRadius: 8, padding: "7px 12px",
              color: a.active ? T.pink : T.textMuted,
              cursor: "pointer", fontSize: 13, fontFamily: T.font,
              flex: 1, justifyContent: "center",
            }}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Feed Page ────────────────────────────────────────────────
export default function FeedPage({ user, onNavigate }) {
  const { posts, loading, createPost, toggleLike, deletePost } = usePosts();
  const { stories, addStory } = useStories();

  const handleAddStory = async (file) => {
    await addStory({
      mediaFile: file,
      authorId: user.uid,
      authorName: user.name,
      authorAvatar: user.avatar,
      verified: user.verified,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>

      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 16px 0",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: T.textPrimary }}>
            مرحباً، <span style={{ color: T.cyan }}>{user.name}</span> 👋
          </h2>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: T.cyanDim, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 20,
        }}>🔔</div>
      </div>

      {/* Stories */}
      <StoriesRow stories={stories} user={user} onAddStory={handleAddStory} />

      {/* Grid Menu */}
      <GridMenu onNavigate={onNavigate} />

      {/* Create Post */}
      <CreatePost user={user} onCreate={createPost} />

      {/* Posts */}
      <div style={{ padding: "0 12px" }}>
        <h3 style={{ color: T.textMuted, fontSize: 12, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 2 }}>
          ● المنشورات الأخيرة
        </h3>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Spinner size={40} />
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          uid={user.uid}
          onLike={toggleLike}
          onDelete={deletePost}
          isAdmin={user.isAdmin}
        />
      ))}

      {!loading && posts.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.textMuted }}>
          <div style={{ fontSize: 48 }}>🌌</div>
          <p>لا توجد منشورات بعد — كن أول من ينشر!</p>
        </div>
      )}
    </div>
  );
}
