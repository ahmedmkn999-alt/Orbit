import React, { useState } from 'react';
import { Smartphone, ShieldCheck } from 'lucide-react';

export default function AuthScreen({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (phone.length >= 10) setStep(2);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orbitSpace p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border-orbitCyan/30 shadow-neonCyan">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orbitCyan to-orbitPurple bg-clip-text text-transparent">Orbit</h1>
          <p className="text-gray-400 mt-2">مرحباً بك في عالمك الجديد</p>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="relative">
              <Smartphone className="absolute right-3 top-3 text-orbitCyan" />
              <input 
                type="tel" 
                placeholder="رقم الموبايل"
                className="w-full bg-black/40 border border-orbitCyan/20 rounded-xl py-3 pr-10 pl-4 text-white focus:outline-none focus:border-orbitCyan transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button 
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-orbitCyan to-orbitPurple text-black font-bold py-3 rounded-xl shadow-neonCyan hover:scale-105 transition-transform"
            >
              استلام الرمز
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <ShieldCheck className="absolute right-3 top-3 text-orbitPurple" />
              <input 
                type="text" 
                placeholder="كود التأكيد"
                className="w-full bg-black/40 border border-orbitPurple/20 rounded-xl py-3 pr-10 pl-4 text-white text-center tracking-[1em] focus:outline-none focus:border-orbitPurple"
              />
            </div>
            <button 
              onClick={() => onLogin({ phone, name: 'User' })}
              className="w-full bg-gradient-to-r from-orbitPurple to-orbitPink text-white font-bold py-3 rounded-xl shadow-neonPink"
            >
              دخول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
