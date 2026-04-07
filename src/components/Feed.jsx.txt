import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Users, Layout, Bell, MessageSquare, PlusCircle,
  Heart, Share2, UserPlus, X, Image, Video, Smile,
  MoreHorizontal, Bookmark, Flag, Trash2, ChevronDown,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, serverTimestamp, doc, updateDoc, arrayUnion,
  arrayRemove, getDoc, getDocs, where, deleteDoc
} from 'firebase/firestore';
import { uploadToCloudinary } from '../services/cloudinary';

export default function Feed() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [newPostMediaType, setNewPostMediaType] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showPostBox, setShowPostBox] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Load posts
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load stories
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load friend requests
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'friendRequests'), where('to', '==', user.uid), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      setFriendRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Load notifications
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('toUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  // Create post
  const handlePost = async () => {
    if (!newPostText.trim() && !newPostMedia) return;
    setPosting(true);
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (newPostMedia) {
        const result = await uploadToCloudinary(newPostMedia, 'orbit/posts');
        if (result.success) {
          mediaUrl = result.url;
          mediaType = newPostMediaType;
        }
      }
      await addDoc(collection(db, 'posts'), {
        text: newPostText,
        mediaUrl,
        mediaType,
        authorUid: user.uid,
        authorName: profile?.name || 'مستخدم',
        authorAvatar: profile?.profilePicture || null,
        authorVerified: profile?.verified || false,
        location: profile?.location || null,
        likes: [],
        comments: [],
        shares: 0,
        createdAt: serverTimestamp(),
      });
      setNewPostText('');
      setNewPostMedia(null);
      setNewPostMediaType(null);
      setShowPostBox(false);
    } catch (e) {
      console.error(e);
    }
    setPosting(false);
  };

  // Like post
  const handleLike = async (post) => {
    const ref = doc(db, 'posts', post.id);
    const liked = post.likes?.includes(user.uid);
    await updateDoc(ref, {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  // Delete post
  const handleDelete = async (postId) => {
    await deleteDoc(doc(db, 'posts', postId));
    setPostMenuOpen(null);
  };

  // Accept friend request
  const handleAcceptFriend = async (req) => {
    await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });
    // Add to both users' friends list
    await updateDoc(doc(db, 'users', user.uid), { friends: arrayUnion(req.from) });
    await updateDoc(doc(db, 'users', req.from), { friends: arrayUnion(user.uid) });
  };

  const handleRejectFriend = async (req) => {
    await deleteDoc(doc(db, 'friendRequests', req.id));
  };

  // Mark notifications read
  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications);
    notifications.filter(n => !n.read).forEach(async (n) => {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    });
  };

  const handleMediaSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setNewPostMedia(file);
      setNewPostMediaType(type);
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - ts.toMillis();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${Math.floor(hrs / 24)} يوم`;
  };

  return (
    <div className="min-h-screen bg-orbitSpace text-white pb-24" dir="rtl">

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel px-4 py-3 flex justify-between items-center border-b border-orbitCyan/20">
        <h1 className="text-2xl font-black text-orbitCyan italic tracking-tighter animate-glow">ORBIT</h1>
        <div className="flex gap-4 items-center">
          {/* Notifications */}
          <div className="relative">
            <button onClick={handleOpenNotifications}>
              <Bell className="text-gray-300 w-6 h-6" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 bg-orbitPink text-[10px] px-1 rounded-full animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-10 left-0 w-72 glass-panel-strong rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-white/10 flex justify-between items-center">
                  <span className="font-bold text-sm">الإشعارات</span>
                  <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">لا توجد إشعارات</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b border-white/5 text-xs ${!n.read ? 'bg-orbitCyan/5' : ''}`}>
                      <p className="text-gray-300">{n.text}</p>
                      <p className="text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/chat')}>
            <MessageSquare className="text-gray-300 w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-black/20 p-1 m-4 rounded-xl border border-white/5">
        {[
          { key: 'home', label: 'الرئيسية' },
          { key: 'groups', label: 'المجموعات' },
          { key: 'friends', label: 'الأصدقاء' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm transition-all ${activeTab === t.key ? 'bg-orbitCyan text-black font-bold' : 'text-gray-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* HOME TAB */}
      {activeTab === 'home' && (
        <div>
          {/* Stories */}
          <div className="flex gap-3 overflow-x-auto px-4 mb-4 no-scrollbar">
            <div className="flex-shrink-0 w-16 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-orbitCyan flex items-center justify-center bg-orbitCyan/10 cursor-pointer"
              >
                <PlusCircle className="text-orbitCyan" />
              </div>
              <span className="text-[10px] mt-1 block text-gray-400">قصتك</span>
            </div>
            {stories.map(s => (
              <div key={s.id} className="flex-shrink-0 w-16 text-center">
                <div className="w-16 h-16 rounded-2xl border-2 border-orbitPurple p-0.5 overflow-hidden">
                  <img
                    src={s.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.authorUid}`}
                    alt="story"
                    className="w-full h-full object-cover bg-black rounded-xl"
                  />
                </div>
                <span className="text-[10px] mt-1 block text-gray-400 truncate">{s.authorName}</span>
              </div>
            ))}
          </div>

          {/* Create Post Box */}
          <div className="mx-4 mb-4 glass-panel rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-orbitCyan to-orbitPurple p-0.5 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-orbitSpace overflow-hidden flex items-center justify-center">
                  {profile?.profilePicture
                    ? <img src={profile.profilePicture} alt="me" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold">{profile?.name?.[0] || 'A'}</span>
                  }
                </div>
              </div>
              <button
                onClick={() => setShowPostBox(true)}
                className="flex-1 bg-white/5 rounded-full px-4 py-2 text-gray-500 text-sm text-right"
              >
                ماذا يدور في ذهنك؟
              </button>
            </div>
            <div className="flex gap-4 border-t border-white/5 pt-3">
              <button onClick={() => { setShowPostBox(true); setTimeout(() => fileInputRef.current?.click(), 100); }} className="flex items-center gap-2 text-xs text-gray-400 hover:text-orbitCyan transition-colors">
                <Image size={16} /> صورة
              </button>
              <button onClick={() => { setShowPostBox(true); setTimeout(() => videoInputRef.current?.click(), 100); }} className="flex items-center gap-2 text-xs text-gray-400 hover:text-orbitPurple transition-colors">
                <Video size={16} /> فيديو
              </button>
              <button onClick={() => setShowPostBox(true)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-orbitPink transition-colors">
                <Smile size={16} /> شعور
              </button>
            </div>
          </div>

          {/* Create Post Modal */}
          {showPostBox && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="glass-panel-strong w-full max-w-lg rounded-3xl p-6 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">إنشاء منشور</h3>
                  <button onClick={() => setShowPostBox(false)}><X size={20} /></button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-orbitCyan to-orbitPurple p-0.5">
                    <div className="w-full h-full rounded-full bg-orbitSpace flex items-center justify-center overflow-hidden">
                      {profile?.profilePicture
                        ? <img src={profile.profilePicture} className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold">{profile?.name?.[0] || 'A'}</span>
                      }
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{profile?.name || 'مستخدم'}</p>
                    <p className="text-xs text-gray-500">عام</p>
                  </div>
                </div>
                <textarea
                  className="w-full bg-transparent text-white placeholder-gray-500 text-base resize-none focus:outline-none min-h-[100px]"
                  placeholder="ماذا يدور في ذهنك؟"
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  autoFocus
                />
                {newPostMedia && (
                  <div className="relative mt-2 rounded-xl overflow-hidden bg-black/40">
                    {newPostMediaType === 'image'
                      ? <img src={URL.createObjectURL(newPostMedia)} className="w-full max-h-48 object-cover" />
                      : <video src={URL.createObjectURL(newPostMedia)} className="w-full max-h-48" controls />
                    }
                    <button
                      onClick={() => setNewPostMedia(null)}
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <div className="flex gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="text-orbitCyan hover:scale-110 transition-transform">
                      <Image size={22} />
                    </button>
                    <button onClick={() => videoInputRef.current?.click()} className="text-orbitPurple hover:scale-110 transition-transform">
                      <Video size={22} />
                    </button>
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={posting || (!newPostText.trim() && !newPostMedia)}
                    className="btn-primary py-2 px-6 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {posting ? 'جاري النشر...' : 'نشر'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleMediaSelect(e, 'image')} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleMediaSelect(e, 'video')} />

          {/* Posts Feed */}
          <main className="px-4 space-y-4">
            {posts.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <p className="text-4xl mb-3">🌌</p>
                <p>لا توجد منشورات بعد</p>
                <p className="text-sm mt-1">كن أول من ينشر!</p>
              </div>
            )}
            {posts.map(post => (
              <div key={post.id} className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-xl">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate(`/profile/${post.authorUid}`)}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-orbitCyan to-orbitPurple p-0.5">
                      <div className="w-full h-full rounded-full bg-orbitSpace overflow-hidden flex items-center justify-center">
                        {post.authorAvatar
                          ? <img src={post.authorAvatar} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold">{post.authorName?.[0] || 'U'}</span>
                        }
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">
                        {post.authorName} {post.authorVerified && <span className="text-orbitCyan">✓</span>}
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        {timeAgo(post.createdAt)} {post.location && `• ${post.location}`}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}>
                      <MoreHorizontal size={20} className="text-gray-400" />
                    </button>
                    {postMenuOpen === post.id && (
                      <div className="absolute left-0 top-8 glass-panel-strong rounded-xl border border-white/10 w-40 z-10 overflow-hidden shadow-2xl">
                        <button className="w-full px-4 py-3 text-xs text-right flex items-center gap-2 hover:bg-white/10">
                          <Bookmark size={14} /> حفظ المنشور
                        </button>
                        <button className="w-full px-4 py-3 text-xs text-right flex items-center gap-2 hover:bg-white/10">
                          <Flag size={14} /> الإبلاغ
                        </button>
                        {post.authorUid === user?.uid && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-full px-4 py-3 text-xs text-right flex items-center gap-2 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={14} /> حذف
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Text */}
                {post.text && (
                  <div className="px-4 pb-3 text-sm leading-relaxed">{post.text}</div>
                )}

                {/* Post Media */}
                {post.mediaUrl && post.mediaType === 'image' && (
                  <img src={post.mediaUrl} alt="post" className="w-full max-h-96 object-cover" />
                )}
                {post.mediaUrl && post.mediaType === 'video' && (
                  <div className="relative bg-black aspect-video flex items-center justify-center">
                    <video src={post.mediaUrl} className="w-full h-full object-contain" controls />
                  </div>
                )}

                {/* Post Actions */}
                <div className="p-4 flex justify-between items-center border-t border-white/5">
                  <div className="flex gap-5">
                    <button
                      onClick={() => handleLike(post)}
                      className={`flex items-center gap-1.5 transition-colors ${post.likes?.includes(user?.uid) ? 'text-orbitPink' : 'text-gray-400 hover:text-orbitPink'}`}
                    >
                      <Heart size={18} fill={post.likes?.includes(user?.uid) ? 'currentColor' : 'none'} />
                      <span className="text-xs">{post.likes?.length || 0}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-gray-400 hover:text-orbitCyan transition-colors">
                      <MessageCircle size={18} />
                      <span className="text-xs">{post.comments?.length || 0}</span>
                    </button>
                  </div>
                  <button className="text-gray-400 hover:text-orbitPurple transition-colors">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </main>
        </div>
      )}

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
        <div className="px-4 space-y-4">
          <h2 className="text-lg font-bold text-orbitCyan">طلبات الصداقة</h2>
          {friendRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-3xl mb-3">👥</p>
              <p>لا توجد طلبات صداقة</p>
            </div>
          ) : friendRequests.map(req => (
            <div key={req.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-orbitPurple/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden">
                  {req.fromAvatar
                    ? <img src={req.fromAvatar} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">{req.fromName?.[0]}</div>
                  }
                </div>
                <div>
                  <p className="text-sm font-bold">{req.fromName || 'مستخدم'}</p>
                  <p className="text-[10px] text-gray-500">يريد إضافتك كصديق</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAcceptFriend(req)} className="bg-orbitCyan text-black px-3 py-1.5 rounded-lg text-xs font-bold">قبول</button>
                <button onClick={() => handleRejectFriend(req)} className="bg-white/10 px-3 py-1.5 rounded-lg text-xs">رفض</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GROUPS TAB */}
      {activeTab === 'groups' && (
        <div className="px-4 text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">👥</p>
          <p>المجموعات قريباً</p>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-orbitCyan/20 py-3 flex justify-around items-center rounded-t-[2.5rem] shadow-2xl z-50">
        <button onClick={() => setActiveTab('home')}>
          <Home className={activeTab === 'home' ? 'text-orbitCyan drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]' : 'text-gray-500'} />
        </button>
        <button onClick={() => setActiveTab('groups')}>
          <Layout className={activeTab === 'groups' ? 'text-orbitPurple' : 'text-gray-500'} />
        </button>
        <div
          onClick={() => setShowPostBox(true)}
          className="bg-gradient-to-tr from-orbitCyan to-orbitPurple p-3 rounded-2xl -mt-12 shadow-neonCyan cursor-pointer hover:scale-110 transition-transform"
        >
          <PlusCircle className="text-black w-6 h-6" />
        </div>
        <button onClick={() => setActiveTab('friends')}>
          <Users className={activeTab === 'friends' ? 'text-orbitPink' : 'text-gray-500'} />
        </button>
        <button onClick={() => navigate(`/profile/${user?.uid}`)}>
          <div className="w-7 h-7 rounded-full border border-orbitCyan overflow-hidden">
            {profile?.profilePicture
              ? <img src={profile.profilePicture} className="w-full h-full object-cover" />
              : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="me" />
            }
          </div>
        </button>
      </nav>
    </div>
  );
}
