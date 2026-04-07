import React, { useState } from 'react';
import { Home, Users, Layout, Bell, MessageSquare, PlusCircle, Heart, Share2, UserPlus } from 'lucide-react';

export default function Feed({ user }) {
  const [activeTab, setActiveTab] = useState('home'); // home, groups, pages, friends

  return (
    <div className="min-h-screen bg-orbitSpace text-white pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-panel px-4 py-3 flex justify-between items-center border-b border-orbitCyan/20">
        <h1 className="text-2xl font-black text-orbitCyan italic tracking-tighter">ORBIT</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Bell className="text-gray-300 w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-orbitPink text-[10px] px-1 rounded-full animate-pulse">3</span>
          </div>
          <MessageSquare className="text-gray-300 w-6 h-6" onClick={() => window.location.hash = 'chat'} />
        </div>
      </header>

      {/* Navigation Tabs (المجموعات والصفحات) */}
      <div className="flex bg-black/20 p-1 m-4 rounded-xl border border-white/5">
        <button onClick={() => setActiveTab('home')} className={`flex-1 py-2 rounded-lg text-sm transition-all ${activeTab === 'home' ? 'bg-orbitCyan text-black font-bold' : 'text-gray-400'}`}>الرئيسية</button>
        <button onClick={() => setActiveTab('groups')} className={`flex-1 py-2 rounded-lg text-sm transition-all ${activeTab === 'groups' ? 'bg-orbitPurple text-white font-bold' : 'text-gray-400'}`}>المجموعات</button>
        <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2 rounded-lg text-sm transition-all ${activeTab === 'friends' ? 'bg-orbitPink text-white font-bold' : 'text-gray-400'}`}>الأصدقاء</button>
      </div>

      {/* Stories Section */}
      {activeTab === 'home' && (
        <div className="flex gap-3 overflow-x-auto px-4 mb-6 no-scrollbar">
          <div className="flex-shrink-0 w-16 h-18 text-center">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-orbitCyan flex items-center justify-center bg-orbitCyan/10">
              <PlusCircle className="text-orbitCyan" />
            </div>
            <span className="text-[10px] mt-1 block text-gray-400">قصتك</span>
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-16 h-18 text-center">
              <div className="w-16 h-16 rounded-2xl border-2 border-orbitPurple p-0.5 shadow-neonCyan overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} alt="story" className="bg-black w-full h-full object-cover" />
              </div>
              <span className="text-[10px] mt-1 block text-gray-400 truncate">مستخدم {i}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="px-4 space-y-6">
        {activeTab === 'home' && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-xl">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orbitCyan to-orbitPurple p-0.5">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs">AM</div>
                </div>
                <div>
                  <h3 className="text-sm font-bold">Ahmed Mohamed ✓</h3>
                  <p className="text-[10px] text-gray-500">منذ 5 دقائق • الإسكندرية</p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-2 text-sm leading-relaxed">
              يا شباب، تجربة نظام الفيديوهات الجديد في أوربيت.. إيه رأيكم في السرعة؟ 🔥🚀
            </div>
            <div className="aspect-video bg-black/40 flex items-center justify-center group relative cursor-pointer">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
               <div className="w-12 h-12 rounded-full bg-orbitCyan/20 flex items-center justify-center backdrop-blur-md border border-orbitCyan/50 group-hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-orbitCyan border-b-[8px] border-b-transparent ml-1"></div>
               </div>
            </div>
            <div className="p-4 flex justify-between items-center border-t border-white/5">
              <div className="flex gap-6">
                <button className="flex items-center gap-1 text-orbitPink"><Heart size={18} /> <span className="text-xs">1.5k</span></button>
                <button className="flex items-center gap-1 text-gray-400"><MessageSquare size={18} /> <span className="text-xs">240</span></button>
              </div>
              <Share2 size={18} className="text-gray-400" />
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-orbitCyan">طلبات الصداقة</h2>
            {[1, 2].map(i => (
              <div key={i} className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-orbitPurple/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-800"></div>
                  <div>
                    <p className="text-sm font-bold">يوسف كامل</p>
                    <p className="text-[10px] text-gray-500">صديق مشترك</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-orbitCyan text-black p-2 rounded-lg"><UserPlus size={16}/></button>
                  <button className="bg-white/10 p-2 rounded-lg text-xs">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-orbitCyan/20 py-3 flex justify-around items-center rounded-t-[2.5rem] shadow-2xl z-50">
        <Home className={activeTab === 'home' ? "text-orbitCyan drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]" : "text-gray-500"} onClick={() => setActiveTab('home')} />
        <Layout className={activeTab === 'groups' ? "text-orbitPurple" : "text-gray-500"} onClick={() => setActiveTab('groups')} />
        <div className="bg-gradient-to-tr from-orbitCyan to-orbitPurple p-3 rounded-2xl -mt-12 shadow-neonCyan transform hover:rotate-90 transition-transform">
          <PlusCircle className="text-black w-6 h-6" />
        </div>
        <Users className={activeTab === 'friends' ? "text-orbitPink" : "text-gray-500"} onClick={() => setActiveTab('friends')} />
        <div className="w-6 h-6 rounded-full bg-gray-600 border border-orbitCyan overflow-hidden">
           <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed" alt="me" />
        </div>
      </nav>
    </div>
  );
}
