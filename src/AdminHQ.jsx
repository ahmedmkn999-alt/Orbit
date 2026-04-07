import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  Settings, 
  BarChart3,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit,
  where,
  updateDoc,
  doc 
} from 'firebase/firestore';

export default function AdminHQ() {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activePosts: 0,
    pendingReports: 0,
    bannedUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
    loadAdminData();
  }, [isAdmin]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      // Calculate stats
      setStats({
        totalUsers: usersData.length,
        activePosts: 0, // Add post counting logic
        pendingReports: 0, // Add reports counting logic
        bannedUsers: usersData.filter(u => u.accountStatus === 'banned').length
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    setLoading(false);
  };

  const handleBanUser = async (userId, reason) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'banned',
        banReason: reason,
        bannedAt: new Date()
      });
      loadAdminData();
      alert('تم حظر المستخدم بنجاح');
    } catch (error) {
      console.error('Error banning user:', error);
      alert('فشل حظر المستخدم');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        accountStatus: 'active',
        banReason: null,
        unbannedAt: new Date()
      });
      loadAdminData();
      alert('تم إلغاء حظر المستخدم بنجاح');
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('فشل إلغاء الحظر');
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        verified: true,
        verifiedAt: new Date()
      });
      loadAdminData();
      alert('تم توثيق المستخدم بنجاح');
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('فشل توثيق المستخدم');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.includes(searchTerm)
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-orbitSpace text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-orbitCyan/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-orbitCyan" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gradient">Admin HQ</h1>
                <p className="text-xs text-gray-400">لوحة التحكم الإدارية</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-left">
                <p className="text-sm font-bold">{profile?.name}</p>
                <p className="text-xs text-orbitCyan">مدير النظام</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      {activeTab === 'overview' && (
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-panel p-6 rounded-2xl border border-orbitCyan/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orbitCyan/20 rounded-xl">
                  <Users className="text-orbitCyan" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-400">إجمالي المستخدمين</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-orbitPurple/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orbitPurple/20 rounded-xl">
                  <FileText className="text-orbitPurple" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activePosts}</p>
                  <p className="text-sm text-gray-400">المنشورات النشطة</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-orbitPink/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orbitPink/20 rounded-xl">
                  <AlertTriangle className="text-orbitPink" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                  <p className="text-sm text-gray-400">البلاغات المعلقة</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <Ban className="text-red-400" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.bannedUsers}</p>
                  <p className="text-sm text-gray-400">المستخدمون المحظورون</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('users')}
              className="px-4 py-2 bg-orbitCyan text-black font-bold rounded-xl hover:scale-105 transition-transform"
            >
              إدارة المستخدمين
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="px-4 py-2 bg-orbitPurple text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              البلاغات
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="px-4 py-2 bg-orbitPink text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              التحليلات
            </button>
          </div>
        </div>
      )}

      {/* Users Management */}
      {activeTab === 'users' && (
        <div className="container mx-auto px-4 py-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">إدارة المستخدمين</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pr-10 py-2 w-64 text-sm"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div 
                    key={user.id}
                    className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{user.name}</p>
                          {user.verified && (
                            <CheckCircle className="text-orbitCyan" size={16} />
                          )}
                          {user.accountStatus === 'banned' && (
                            <Ban className="text-red-400" size={16} />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{user.phoneNumber}</p>
                        <p className="text-xs text-gray-500">
                          {user.accountStatus === 'banned' ? `محظور: ${user.banReason}` : 'نشط'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!user.verified && (
                        <button
                          onClick={() => handleVerifyUser(user.id)}
                          className="px-3 py-1 bg-orbitCyan text-black text-xs font-bold rounded-lg hover:scale-105 transition-transform"
                        >
                          توثيق
                        </button>
                      )}
                      
                      {user.accountStatus !== 'banned' ? (
                        <button
                          onClick={() => {
                            const reason = prompt('سبب الحظر:');
                            if (reason) handleBanUser(user.id, reason);
                          }}
                          className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:scale-105 transition-transform"
                        >
                          حظر
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:scale-105 transition-transform"
                        >
                          إلغاء الحظر
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports */}
      {activeTab === 'reports' && (
        <div className="container mx-auto px-4 py-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold mb-6">البلاغات</h2>
            <p className="text-gray-400 text-center py-12">لا توجد بلاغات حالياً</p>
          </div>
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div className="container mx-auto px-4 py-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold mb-6">التحليلات</h2>
            <p className="text-gray-400 text-center py-12">قريباً...</p>
          </div>
        </div>
      )}
    </div>
  );
}
