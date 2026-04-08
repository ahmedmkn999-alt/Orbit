import React, { useState, useRef, useEffect } from 'react';
import { Smartphone, ShieldCheck, User, Calendar, Camera, Users, MapPin, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { createUserProfile, uploadProfilePicture } from '../services/firebase';

export default function AdvancedAuthScreen() {
  const { sendOTP, verifyOTP } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: profile setup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    birthDate: '',
    gender: '',
    bio: '',
    location: '',
    email: '',
    profilePicture: null
  });
  
  const [previewImage, setPreviewImage] = useState(null);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const fileInputRef = useRef(null);

  // Step 1: Phone Number
  const handleSendOTP = async () => {
    const cleaned = phoneNumber.replace(/\s/g, '');
    if (cleaned.length < 10) {
      setError('رقم الهاتف غير صحيح. يجب أن يكون 10 أرقام على الأقل');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await sendOTP(cleaned);
    
    if (result.success) {
      setStep(2);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    const cleanedOtp = otp.replace(/\s/g, '');
    if (cleanedOtp.length < 6) {
      setError('كود التأكيد يجب أن يكون 6 أرقام');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await verifyOTP(cleanedOtp);
    
    if (result.success) {
      setVerifiedUser(result.user);
      if (result.isNewUser) {
        setStep(3); // Go to profile setup
      } else {
        // Existing user - redirect to app
        window.location.href = '/home';
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  // Step 3: Complete Profile
  const handleProfileComplete = async () => {
    if (!profileData.name.trim()) {
      setError('الرجاء إدخال الاسم الكامل');
      return;
    }
    if (!profileData.birthDate) {
      setError('الرجاء إدخال تاريخ الميلاد');
      return;
    }
    if (!profileData.gender) {
      setError('الرجاء اختيار الجنس');
      return;
    }
    
    if (!verifiedUser) {
      setError('حدث خطأ. يرجى البدء من جديد');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Upload profile picture if exists
      let profilePictureUrl = null;
      if (profileData.profilePicture) {
        const uploadResult = await uploadProfilePicture(
          verifiedUser.uid,
          profileData.profilePicture
        );
        if (uploadResult.success) {
          profilePictureUrl = uploadResult.url;
        }
      }
      
      // Create user profile
      const result = await createUserProfile(verifiedUser.uid, {
        name: profileData.name.trim(),
        phoneNumber: phoneNumber,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        bio: profileData.bio.trim(),
        location: profileData.location.trim(),
        email: profileData.email.trim(),
        profilePicture: profilePictureUrl
      });
      
      if (result.success) {
        window.location.href = '/home';
      } else {
        setError(result.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار صورة صحيحة');
        return;
      }
      setProfileData({ ...profileData, profilePicture: file });
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orbitSpace p-4">
      {/* reCAPTCHA container - MUST exist in DOM before sendOTP is called */}
      <div id="recaptcha-container"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-orbitCyan/30 shadow-neonCyan">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gradient mb-2 animate-glow">ORBIT</h1>
          <p className="text-gray-400">{t('auth.welcome')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${
              s === step ? 'w-8 bg-orbitCyan' :
              s < step ? 'w-4 bg-orbitPurple' :
              'w-4 bg-white/10'
            }`} />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-4 text-sm text-right">
            {error}
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-3 text-right">أدخل رقم هاتفك للتحقق</p>
              <div className="relative">
                <Smartphone className="absolute right-3 top-3.5 text-orbitCyan" size={20} />
                <input 
                  type="tel" 
                  placeholder="01XXXXXXXXX"
                  className="input-field pr-12 text-left tracking-wider"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleSendOTP)}
                  dir="ltr"
                  autoComplete="tel"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2 text-right">مثال: 01001234567</p>
            </div>
            
            <button 
              onClick={handleSendOTP}
              disabled={loading || phoneNumber.length < 10}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>جاري الإرسال...</span>
                </div>
              ) : (
                t('auth.getCode')
              )}
            </button>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-3 text-right">
                تم إرسال رمز التحقق إلى <span className="text-orbitCyan">{phoneNumber}</span>
              </p>
              <div className="relative">
                <ShieldCheck className="absolute right-3 top-3.5 text-orbitPurple" size={20} />
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="_ _ _ _ _ _"
                  className="input-field pr-12 text-center tracking-[0.5em] text-xl font-bold"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => handleKeyDown(e, handleVerifyOTP)}
                  maxLength={6}
                  dir="ltr"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </div>
            
            <button 
              onClick={handleVerifyOTP}
              disabled={loading || otp.length < 6}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                t('auth.login')
              )}
            </button>
            
            <button 
              onClick={() => { setStep(1); setOtp(''); setError(''); }}
              className="w-full text-center text-sm text-gray-400 hover:text-orbitCyan transition-colors flex items-center justify-center gap-1"
            >
              <ArrowRight size={14} /> تغيير رقم الهاتف
            </button>
          </div>
        )}

        {/* Step 3: Profile Setup */}
        {step === 3 && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            <p className="text-sm text-gray-400 text-right mb-2">أكمل ملفك الشخصي</p>

            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-3 mb-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-orbitCyan to-orbitPurple p-1 cursor-pointer group"
              >
                <div className="w-full h-full rounded-full bg-orbitSpace flex items-center justify-center overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-gray-500 group-hover:text-orbitCyan transition-colors" size={36} />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-orbitCyan rounded-full p-1.5">
                  <Camera size={14} className="text-black" />
                </div>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500">اضغط لإضافة صورة (اختياري)</p>
            </div>

            {/* Name */}
            <div className="relative">
              <User className="absolute right-3 top-3.5 text-orbitCyan" size={18} />
              <input 
                type="text" 
                placeholder="الاسم الكامل *"
                className="input-field pr-11 text-sm"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                autoFocus
              />
            </div>

            {/* Birth Date */}
            <div className="relative">
              <Calendar className="absolute right-3 top-3.5 text-orbitPurple" size={18} />
              <input 
                type="text" 
                placeholder="تاريخ الميلاد (DD/MM/YYYY) *"
                className="input-field pr-11 text-sm"
                value={profileData.birthDate}
                onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                dir="ltr"
              />
            </div>

            {/* Gender */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setProfileData({ ...profileData, gender: 'male' })}
                className={`flex-1 py-3 rounded-xl border transition-all font-medium text-sm ${
                  profileData.gender === 'male' 
                    ? 'bg-orbitCyan text-black border-orbitCyan font-bold' 
                    : 'bg-black/40 border-white/20 text-gray-400 hover:border-orbitCyan/50'
                }`}
              >
                ذكر
              </button>
              <button
                type="button"
                onClick={() => setProfileData({ ...profileData, gender: 'female' })}
                className={`flex-1 py-3 rounded-xl border transition-all font-medium text-sm ${
                  profileData.gender === 'female' 
                    ? 'bg-orbitPink text-white border-orbitPink font-bold' 
                    : 'bg-black/40 border-white/20 text-gray-400 hover:border-orbitPink/50'
                }`}
              >
                أنثى
              </button>
            </div>

            {/* Bio */}
            <div className="relative">
              <Users className="absolute right-3 top-3 text-orbitPurple" size={18} />
              <textarea 
                placeholder="نبذة عنك (اختياري)"
                className="input-field pr-11 text-sm min-h-[80px] resize-none"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                maxLength={150}
              />
              <span className="text-xs text-gray-500 mt-1 block text-left">
                {profileData.bio.length}/150
              </span>
            </div>

            {/* Location */}
            <div className="relative">
              <MapPin className="absolute right-3 top-3.5 text-orbitCyan" size={18} />
              <input 
                type="text" 
                placeholder="المدينة / الموقع (اختياري)"
                className="input-field pr-11 text-sm"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute right-3 top-3.5 text-orbitPurple" size={18} />
              <input 
                type="email" 
                placeholder="البريد الإلكتروني (اختياري)"
                className="input-field pr-11 text-sm"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                dir="ltr"
              />
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleProfileComplete}
              disabled={loading || !profileData.name.trim() || !profileData.birthDate || !profileData.gender}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>جاري إنشاء الحساب...</span>
                </div>
              ) : (
                'إنشاء الحساب 🚀'
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,245,255,0.3); border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,245,255,0.5); }
      `}</style>
    </div>
  );
    }
