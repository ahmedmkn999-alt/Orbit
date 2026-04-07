import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight, Camera, Edit3, UserPlus, MessageSquare,
  UserCheck, Heart, MessageCircle, Share2, Grid, BookOpen,
  MapPin, Calendar, Mail, LogOut, Settings, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import {
  doc, getDoc, collection, query, where, onSnapshot,
  orderBy, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { uploadProfilePicture } from '../services/firebase';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user, profile: myProfile, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const isMe = !userId || userId === user?.uid;
  const targetUid = isMe ? user?.uid : userId;

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null); // null, 'pending', 'friends'
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Load profile
  useEffect(() => {
    if (!targetUid) return;
    const loadProfile = async () => {
      const userDoc = await getDoc(doc(db, 'users', targetUid));
      if (userDoc.exists()) {
        setProfileData(userDoc.data());
        setEditData(userDoc.data());
      }
      setLoading(false);
    };
    loadProfile();
  }, [targetUid]);

  // Load user posts
  useEffect(() => {
    if (!targetUid) return;
    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', targetUid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [targetUid]);

  // Check friend status
  useEffect(() => {
    if (isMe || !user || !targetUid) return;
    const check = async () => {
      const myDoc = await getDoc(doc(db, 'users', user.uid));
      if (myDoc.exists()) {
        const friends = myDoc.data().friends || [];
        if (friends.includes(targetUid)) {
          setFriendStatus('friends');
          return;
        }
      }
      const q = query(
        collection(db, 'friendRequests'),
        where('from', '==', user.uid),
        where('to', '==', targetUid),
        where('status', '==', 'pending')
      );
      const reqSnap = await (await import('firebase/firestore')).getDocs(q);
      if (!reqSnap.empty) setFriendStatus('pending');
    };
    check();
  }, [isMe, user, targetUid]);

  const handleSendFriendRequest = async () => {
    await addDoc(collection(db, 'friendRequests'), {
      from: user.uid,
      fromName: myProfile?.name || 'مستخدم',
      fromAvatar: myProfile?.profilePicture || null,
      to: targetUid,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    setFriendStatus('pending');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    const result = await uploadProfilePicture(user.uid, file);
    if (result.success) {
      setProfileData(prev => ({ ...prev, profilePicture: result.url }));
    }
    setUploadingAvatar(false);
  };

  const handleSaveEdit = async () => {
    const result = await updateProfile({
      name: editData.name,
      bio: editData.bio,
      location: editData.location,
      email: editData.email,
    });
    if (result.success) {
      setProfileData(prev => ({ ...prev, ...editData }));
      setEditMode(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleLike = async (post) => {
    const ref = doc(db, 'posts', post.id);
    const liked = post.likes?.includes(user?.uid);
    await updateDoc(ref, {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orbitSpace flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-orbitSpace text-white flex flex-col items-center justify-center">
        <p className="text-gray-400">المستخدم غير موجود</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">الرئيسية</button>
      </div>
    );
  }

  const displayData = isMe ? (myProfile || profileData) : profileData;

  return (
    <div className="min-h-screen bg-orbitSpace text-white pb-10" dir="rtl">

      {/* Header */}
      <div className="sticky top-0 z-50 glass-panel px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ChevronRight className="text-orbitCyan" />
        </button>
        <h2 className="font-black text-lg flex-1">{displayData?.name || 'الملف الشخصي'}</h2>
        {isMe && (
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors">
            <LogOut size={20} />
          </button>
        )}
      </div>

      {/* Cover */}
      <div className="relative h-44 bg-gradient-to-br from-orbitCyan/20 via-orbitPurple/20 to-orbitPink/20">
        {displayData?.coverPhoto && (
          <img src={displayData.coverPhoto} className="w-full h-full object-cover" />
        )}
        {isMe && (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-3 left-3 glass-panel p-2 rounded-xl border border-white/20 hover:border-orbitCyan transition-colors"
          >
            <Camera size={16} className="text-white" />
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" />
      </div>

      {/* Avatar + Actions */}
      <div className="px-4 pb-4 border-b border-white/10">
        <div className="flex justify-between items-end -mt-12 mb-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-orbitSpace overflow-hidden bg-gradient-to-tr from-orbitCyan to-orbitPurple p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-orbitSpace flex items-center justify-center">
                {displayData?.profilePicture
                  ? <img src={displayData.profilePicture} className="w-full h-full object-cover" />
                  : <span className="text-2xl font-black">{displayData?.name?.[0] || 'U'}</span>
                }
              </div>
            </div>
            {isMe && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-orbitCyan p-1.5 rounded-full border-2 border-orbitSpace"
              >
                {uploadingAvatar ? <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" /> : <Camera size={12} className="text-black" />}
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-14">
            {isMe ? (
              <button
                onClick={() => setEditMode(true)}
                className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
              >
                <Edit3 size={14} /> تعديل الملف
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate(`/chat/${targetUid}`)}
                  className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                >
                  <MessageSquare size={14} /> رسالة
                </button>
                <button
                  onClick={friendStatus === null ? handleSendFriendRequest : undefined}
                  className={`py-2 px-4 text-sm rounded-xl flex items-center gap-2 font-bold ${
                    friendStatus === 'friends' ? 'btn-secondary' :
                    friendStatus === 'pending' ? 'bg-gray-600 text-gray-300 cursor-default' :
                    'btn-primary'
                  }`}
                >
                  {friendStatus === 'friends' ? <><UserCheck size={14} /> أصدقاء</> :
                   friendStatus === 'pending' ? 'طلب مرسل' :
                   <><UserPlus size={14} /> إضافة</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <h2 className="text-xl font-black mb-1">
          {displayData?.name}
          {displayData?.verified && <span className="text-orbitCyan text-base mr-1">✓</span>}
        </h2>
        {displayData?.bio && <p className="text-gray-400 text-sm mb-3">{displayData.bio}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
          {displayData?.location && (
            <span className="flex items-center gap-1"><MapPin size={12} />{displayData.location}</span>
          )}
          {displayData?.email && (
            <span className="flex items-center gap-1"><Mail size={12} />{displayData.email}</span>
          )}
          {displayData?.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              انضم {displayData.createdAt.toDate?.()?.getFullYear?.() || '2026'}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <p className="font-black text-lg text-orbitCyan">{posts.length}</p>
            <p className="text-gray-500 text-xs">منشور</p>
          </div>
          <div className="text-center">
            <p className="font-black text-lg text-orbitPurple">{displayData?.friends?.length || 0}</p>
            <p className="text-gray-500 text-xs">صديق</p>
          </div>
          <div className="text-center">
            <p className="font-black text-lg text-orbitPink">
              {posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0)}
            </p>
            <p className="text-gray-500 text-xs">إعجاب</p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end p-4">
          <div className="glass-panel-strong w-full rounded-3xl p-6 border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">تعديل الملف الشخصي</h3>
              <button onClick={() => setEditMode(false)} className="text-gray-400">✕</button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                className="input-field text-sm"
                placeholder="الاسم"
                value={editData.name || ''}
                onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
              />
              <textarea
                className="input-field text-sm min-h-[80px] resize-none"
                placeholder="نبذة عنك"
                value={editData.bio || ''}
                onChange={e => setEditData(p => ({ ...p, bio: e.target.value }))}
                maxLength={150}
              />
              <input
                type="text"
                className="input-field text-sm"
                placeholder="الموقع"
                value={editData.location || ''}
                onChange={e => setEditData(p => ({ ...p, location: e.target.value }))}
              />
              <input
                type="email"
                className="input-field text-sm"
                placeholder="البريد الإلكتروني"
                value={editData.email || ''}
                onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveEdit} className="btn-primary flex-1 py-3">حفظ</button>
              <button onClick={() => setEditMode(false)} className="btn-secondary flex-1 py-3">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Tab */}
      <div className="flex border-b border-white/10 mt-2">
        {[
          { key: 'posts', label: 'المنشورات', icon: <Grid size={16} /> },
          { key: 'saved', label: 'المحفوظة', icon: <BookOpen size={16} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm transition-colors border-b-2 ${
              activeTab === t.key ? 'border-orbitCyan text-orbitCyan' : 'border-transparent text-gray-500'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Posts Grid/List */}
      <div className="px-4 mt-4 space-y-4">
        {activeTab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-3xl mb-3">📭</p>
              <p>لا توجد منشورات بعد</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              {post.text && <div className="p-4 text-sm">{post.text}</div>}
              {post.mediaUrl && post.mediaType === 'image' && (
                <img src={post.mediaUrl} className="w-full max-h-64 object-cover" />
              )}
              {post.mediaUrl && post.mediaType === 'video' && (
                <video src={post.mediaUrl} className="w-full" controls />
              )}
              <div className="px-4 py-3 flex gap-5 border-t border-white/5">
                <button
                  onClick={() => handleLike(post)}
                  className={`flex items-center gap-1.5 text-sm ${post.likes?.includes(user?.uid) ? 'text-orbitPink' : 'text-gray-400'}`}
                >
                  <Heart size={16} fill={post.likes?.includes(user?.uid) ? 'currentColor' : 'none'} />
                  {post.likes?.length || 0}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-gray-400">
                  <MessageCircle size={16} />
                  {post.comments?.length || 0}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-gray-400 mr-auto">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
        {activeTab === 'saved' && (
          <div className="text-center py-12 text-gray-600">
            <p className="text-3xl mb-3">🔖</p>
            <p>المحفوظات قريباً</p>
          </div>
        )}
      </div>
    </div>
  );
}
