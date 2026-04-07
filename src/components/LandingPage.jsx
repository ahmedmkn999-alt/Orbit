import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Shield, Zap, Users, MessageCircle, Video } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-orbitSpace text-white overflow-x-hidden" dir="rtl">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-orbitCyan/20 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-black text-orbitCyan italic tracking-tighter animate-glow">ORBIT</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary text-sm px-5 py-2"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary text-sm px-5 py-2"
          >
            إنشاء حساب
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orbitCyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-orbitPurple/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <h2 className="text-6xl font-black text-gradient mb-4 animate-glow">ORBIT</h2>
          <p className="text-xl text-gray-300 mb-3 font-medium">عالمك الجديد بدأ هنا</p>
          <p className="text-gray-500 mb-10 leading-relaxed">
            تواصل مع أصدقائك، شارك لحظاتك، وكن جزءاً من أكبر مجتمع عربي على الإنترنت
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary text-base px-10 py-4"
            >
              ابدأ الآن — مجاناً
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary text-base px-10 py-4"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold text-center text-gradient mb-12">لماذا Orbit؟</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { icon: <Users size={28} className="text-orbitCyan" />, title: 'تواصل مع الجميع', desc: 'تابع أصدقاءك وابنِ علاقات جديدة' },
            { icon: <MessageCircle size={28} className="text-orbitPurple" />, title: 'رسائل فورية', desc: 'دردشة خاصة سريعة وآمنة' },
            { icon: <Video size={28} className="text-orbitPink" />, title: 'مكالمات فيديو', desc: 'تكلم أصدقاءك وجهاً لوجه' },
            { icon: <Globe size={28} className="text-orbitCyan" />, title: 'مجتمع عربي', desc: 'محتوى عربي حقيقي لك ولأصدقائك' },
            { icon: <Shield size={28} className="text-orbitPurple" />, title: 'أمان وخصوصية', desc: 'بياناتك محمية بأحدث التقنيات' },
            { icon: <Zap size={28} className="text-orbitPink" />, title: 'سريع وخفيف', desc: 'تجربة سلسة على كل الأجهزة' },
          ].map((f, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-orbitCyan/40 transition-all hover:shadow-neonCyan">
              <div className="mb-3">{f.icon}</div>
              <h4 className="font-bold mb-1">{f.title}</h4>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="glass-panel max-w-xl mx-auto rounded-3xl p-10 border border-orbitCyan/20 shadow-neonCyan">
          <h3 className="text-2xl font-black text-gradient mb-3">انضم الآن</h3>
          <p className="text-gray-400 mb-6 text-sm">أكثر من مليون مستخدم بالفعل على ORBIT</p>
          <button onClick={() => navigate('/login')} className="btn-primary px-12 py-4 text-base">
            إنشاء حساب مجاني
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-gray-600 text-xs">
        © 2026 ORBIT · جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
