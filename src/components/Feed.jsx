import React from 'react';
import { Home, Search, PlusSquare, MessageCircle, User, Bell } from 'lucide-react';

export default function Feed({ user, onLogout }) {
  const stories = [1, 2, 3, 4, 5];
  
  return (
    <div className="pb-20 pt-4">
      {/* Header */}
      <header className="px-4 flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-orbitCyan italic">ORBIT</h1>
        <div className="flex gap-4">
          <Bell className="text-gray-300" />
          <MessageCircle className="text-gray-300" onClick={() => window.location.hash = 'chat'} />
        </div>
      </header>

      {/* Stories */}
      <div className="flex gap-3 overflow-x-auto px-4 mb-8 no-scrollbar">
        <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-orbitCyan p-1 flex items-center justify-center">
          <PlusSquare className="text-orbitCyan" />
        </div>
        {stories.map(i => (
          <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-orbitPurple p-0.5 shadow-neonCyan">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="rounded-full bg-black" />
          </div>
        ))}
      </div>

      {/* Post (Neon Card) */}
      <div className="px-4 space-y-6">
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <div className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orbitPurple"></div>
            <span className="font-bold">Ahmed Mohamed ✓</span>
          </div>
          <div className="h-64 bg-black/60 flex items-center justify-center text-orbitCyan font-bold">
             [ محتوى الفيديو أو الصورة ]
          </div>
          <div className="p-3 flex justify-between">
            <div className="flex gap-4"><span>❤️ 1.2k</span><span>💬 80</span></div>
            <span className="text-gray-500">منذ ساعتين</span>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-orbitCyan/20 py-4 flex justify-around items-center rounded-t-3xl shadow-2xl">
        <Home className="text-orbitCyan shadow-neonCyan" />
        <Search className="text-gray-500" />
        <div className="bg-orbitCyan p-2 rounded-xl -mt-10 shadow-neonCyan text-black"><PlusSquare /></div>
        <MessageCircle className="text-gray-500" />
        <User className="text-gray-500" onClick={onLogout} />
      </nav>
    </div>
  );
}
