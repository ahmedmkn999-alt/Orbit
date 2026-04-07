import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Send, ChevronRight, Search, Phone, Video,
  MoreVertical, Image, Smile, Check, CheckCheck,
  Download, Smartphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, getDoc, getDocs,
  updateDoc, arrayUnion
} from 'firebase/firestore';

export default function Chat() {
  const { user, profile } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const messagesEndRef = useRef(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, async (snap) => {
      const convs = await Promise.all(snap.docs.map(async d => {
        const data = { id: d.id, ...d.data() };
        // Get other user info
        const otherId = data.participants.find(p => p !== user.uid);
        if (otherId) {
          const userDoc = await getDoc(doc(db, 'users', otherId));
          data.otherUser = userDoc.exists() ? userDoc.data() : null;
          data.otherId = otherId;
        }
        return data;
      }));
      setConversations(convs);
    });
    return () => unsub();
  }, [user]);

  // Open conversation if userId param
  useEffect(() => {
    if (userId && userId !== user?.uid) {
      openConversation(userId);
    }
  }, [userId, user]);

  const openConversation = async (otherId) => {
    // Get or create conversation
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    const snap = await getDocs(q);
    let convDoc = snap.docs.find(d => d.data().participants.includes(otherId));

    if (!convDoc) {
      // Create new conversation
      const newConv = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid, otherId],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setActiveConv(newConv.id);
    } else {
      setActiveConv(convDoc.id);
    }

    // Get other user
    const otherDoc = await getDoc(doc(db, 'users', otherId));
    if (otherDoc.exists()) setOtherUser(otherDoc.data());
  };

  // Load messages
  useEffect(() => {
    if (!activeConv) return;
    const q = query(
      collection(db, 'conversations', activeConv, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeConv]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv) return;
    setSending(true);
    const text = newMsg;
    setNewMsg('');
    try {
      await addDoc(collection(db, 'conversations', activeConv, 'messages'), {
        text,
        senderUid: user.uid,
        senderName: profile?.name || 'مستخدم',
        createdAt: serverTimestamp(),
        read: false,
      });
      await updateDoc(doc(db, 'conversations', activeConv), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const timeStr = (ts) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  // Conversation List View
  if (!activeConv) {
    return (
      <div className="flex flex-col h-screen bg-orbitSpace text-white" dir="rtl">
        {/* Header */}
        <div className="glass-panel px-4 py-4 border-b border-orbitCyan/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')}>
              <ChevronRight className="text-orbitCyan" />
            </button>
            <h2 className="font-black text-lg text-orbitCyan">الرسائل</h2>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="بحث في الرسائل..."
              className="input-field pr-10 text-sm"
            />
          </div>
        </div>

        {/* App Download Banner */}
        <div
          onClick={() => setShowDownloadPrompt(true)}
          className="mx-4 mb-4 glass-panel rounded-2xl p-4 border border-orbitCyan/30 flex items-center gap-3 cursor-pointer hover:border-orbitCyan transition-colors"
        >
          <div className="bg-orbitCyan/20 p-2 rounded-xl">
            <Smartphone size={20} className="text-orbitCyan" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-orbitCyan">حمّل تطبيق Orbit</p>
            <p className="text-xs text-gray-400">تجربة أفضل على هاتفك</p>
          </div>
          <ChevronRight size={16} className="text-gray-500 rotate-180" />
        </div>

        {/* Download Prompt Modal */}
        {showDownloadPrompt && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end p-4">
            <div className="glass-panel-strong w-full rounded-3xl p-6 border border-orbitCyan/30">
              <h3 className="font-black text-xl text-gradient mb-2">تطبيق Orbit</h3>
              <p className="text-gray-400 text-sm mb-6">هل تريد تحميل التطبيق للحصول على تجربة أفضل؟</p>
              <div className="flex gap-3">
                <button className="btn-primary flex-1 py-3">تحميل التطبيق</button>
                <button
                  onClick={() => setShowDownloadPrompt(false)}
                  className="btn-secondary flex-1 py-3"
                >
                  التصفح هنا
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">💬</p>
              <p>لا توجد محادثات بعد</p>
              <p className="text-sm mt-1">ابدأ محادثة مع أصدقائك</p>
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => {
                setActiveConv(conv.id);
                setOtherUser(conv.otherUser);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                  {conv.otherUser?.profilePicture
                    ? <img src={conv.otherUser.profilePicture} className="w-full h-full object-cover" />
                    : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.otherId}`} className="w-full h-full" />
                  }
                </div>
                {conv.otherUser?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-orbitSpace" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-sm truncate">{conv.otherUser?.name || 'مستخدم'}</p>
                  <span className="text-[10px] text-gray-600">{timeStr(conv.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{conv.lastMessage || 'ابدأ المحادثة'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="flex flex-col h-screen bg-orbitSpace text-white" dir="rtl">
      {/* Chat Header */}
      <div className="glass-panel px-4 py-3 border-b border-orbitCyan/20 flex items-center gap-3">
        <button onClick={() => { setActiveConv(null); navigate('/chat'); }}>
          <ChevronRight className="text-orbitCyan" />
        </button>
        <div
          className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 cursor-pointer"
          onClick={() => otherUser && navigate(`/profile/${conversations.find(c => c.id === activeConv)?.otherId}`)}
        >
          {otherUser?.profilePicture
            ? <img src={otherUser.profilePicture} className="w-full h-full object-cover" />
            : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv}`} className="w-full h-full" />
          }
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-sm">{otherUser?.name || 'مستخدم'}</h2>
          <span className="text-xs text-orbitCyan">
            {otherUser?.isOnline ? 'نشط الآن' : 'غير متصل'}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/call/${activeConv}`)}>
            <Video size={20} className="text-gray-400 hover:text-orbitCyan transition-colors" />
          </button>
          <button onClick={() => navigate(`/call/${activeConv}?audio=true`)}>
            <Phone size={20} className="text-gray-400 hover:text-orbitCyan transition-colors" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            ابدأ المحادثة مع {otherUser?.name || 'المستخدم'}
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderUid === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-orbitCyan/20 border border-orbitCyan/30 rounded-br-none'
                  : 'bg-orbitPurple/20 border border-orbitPurple/30 rounded-bl-none'
              }`}>
                <p>{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                  <span className="text-[10px] text-gray-500">{timeStr(msg.createdAt)}</span>
                  {isMe && (
                    msg.read
                      ? <CheckCheck size={12} className="text-orbitCyan" />
                      : <Check size={12} className="text-gray-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 glass-panel border-t border-white/10 flex gap-2 items-center">
        <button className="text-gray-400 hover:text-orbitPurple transition-colors">
          <Image size={20} />
        </button>
        <input
          type="text"
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-orbitCyan transition-colors"
          placeholder="اكتب رسالة..."
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={sendMessage}
          disabled={!newMsg.trim() || sending}
          className="bg-orbitCyan p-2.5 rounded-full text-black shadow-neonCyan disabled:opacity-40 hover:scale-110 transition-transform"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
