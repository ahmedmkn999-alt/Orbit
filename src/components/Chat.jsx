import React from 'react';
import { Send, ChevronRight } from 'lucide-react';

export default function Chat() {
  return (
    <div className="flex flex-col h-screen bg-orbitSpace">
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <ChevronRight className="text-orbitCyan" />
        <div className="w-10 h-10 rounded-full bg-gray-700"></div>
        <div>
          <h2 className="font-bold text-sm">Ali Bobos</h2>
          <span className="text-xs text-orbitCyan">نشط الآن</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-orbitPurple/20 p-3 rounded-2xl rounded-br-none max-w-[80%] self-end mr-auto border border-orbitPurple/30">
          هتخلص لوحة التحكم إمتى يا جيزاوي؟ 🔥
        </div>
        <div className="bg-white/5 p-3 rounded-2xl rounded-bl-none max-w-[80%] border border-white/10">
          شغال عليها يا بوب، هتكون نيون وجامدة!
        </div>
      </div>

      <div className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
        <input type="text" className="flex-1 bg-white/5 border border-white/20 rounded-full px-4 py-2 focus:outline-none" placeholder="اكتب رسالة..." />
        <button className="bg-orbitCyan p-2 rounded-full text-black shadow-neonCyan"><Send size={20}/></button>
      </div>
    </div>
  );
}
