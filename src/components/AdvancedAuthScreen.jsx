import React, { useState, useRef } from 'react';
import { Smartphone, ShieldCheck, User, Calendar, Camera, Users, MapPin, Mail } from 'lucide-react';
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
  const [verifiedUser, setVerifiedUser] = useState(null); // حفظ الـ user بعد التحقق
  const fileInputRef = useRef(null);

  // Step 1: Phone Number
  const handleSendOTP = async () => {
    if (phoneNumber.length < 10) {
      setError(t('auth.phoneError') || 'رقم الهاتف غير صحيح');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await sendOTP(phoneNumber);
    
    if (result.success) {
      setStep(2);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      setError(t('auth.otpError') || 'كود التأكيد غير صحيح');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await verifyOTP(otp);
    
    if (result.success) {
      setVerifiedUser(result.user); // ✅ حفظ الـ user الصح
      if (result.isNewUser) {
        setStep(3); // Go to profile setup
      } else {
        // Existing user, redirect to app
        window.location.href = '/';
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  // Step 3: Complete Profile
  const handleProfileComplete = async () => {
    // Validation
    if (!profileData.name.trim()) {
      setError('الرجاء إدخال الاسم');
      return;
    }
    
    if (!profileData.birthDate) {
      setError('الرجاء إدخال تاريخ الميلاد');
      return;
    }
    
    if (!profileData.gender) {
      setError('الرجاء اختيار النوع');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Upload profile picture if exists
      let profilePictureUrl = null;
      if (profileData.profilePicture) {
        const uploadResult = await uploadProfilePicture(
          verifiedUser.uid, // ✅ إصلاح: كان verifyOTP.user.uid وده غلط
          profileData.profilePicture
        );
        if (uploadResult.success) {
          profilePictureUrl = uploadResult.url;
        }
      }
      
      // Create user profile
      const result = await createUserProfile(verifiedUser.uid, { // ✅ إصلاح هنا كمان
        name: profileData.name,
        phoneNumber: phoneNumber,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        bio: profileData.bio,
        location: profileData.location,
        email: profileData.email,
        profilePicture: profilePictureUrl
      });
      
      if (result.success) {
        window.location.href = '/';
      } else {
        setError(result.message);
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
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار صورة صحيحة');
        return;
      }
      
      setProfileData({ ...profileData, profilePicture: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orbitSpace p-4">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border-orbitCyan/30 shadow-neonCyan">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gradient mb-2 animate-glow">ORBIT</h1>
          <p className="text-gray-400">{t('auth.welcome')}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="relative">
              <Smartphone className="absolute right-3 top-3 text-orbitCyan" size={20} />
              <input 
                type="tel" 
                placeholder={t('auth.phoneNumber')}
                className="input-field pr-12"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                dir="ltr"
              />
            </div>
            
            <button 
              onClick={handleSendOTP}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>{t('common.loading')}</span>
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
            <div className="relative">
              <ShieldCheck className="absolute right-3 top-3 text-orbitPurple" size={20} />
              <input 
                type="text" 
                placeholder={t('auth.enterCode')}
                className="input-field pr-12 text-center tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                dir="ltr"
              />
            </div>
            
            <button 
              onClick={handleVerifyOTP}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>{t('common.loading')}</span>
                </div>
              ) : (
                t('auth.login')
              )}
            </button>
            
            <button 
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-gray-400 hover:text-orbitCyan transition-colors"
            >
              تغيير رقم الهاتف
            </button>
          </div>
        )}

        {/* Step 3: Profile Setup */}
        {step === 3 && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-orbitCyan to-orbitPurple p-1 cursor-pointer group"
              >
                <div className="w-full h-full rounded-full bg-orbitSpace flex items-center justify-center overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-gray-500 group-hover:text-orbitCyan transition-colors" size={40} />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-orbitCyan rounded-full p-2">
                  <Camera size={16} className="text-black" />
                </div>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="text-xs text-gray-400">اضغط لإضافة صورة</p>
            </div>

            {/* Name */}
            <div className="relative">
              <User className="absolute right-3 top-3 text-orbitCyan" size={18} />
              <input 
                type="text" 
                placeholder="الاسم الكامل"
                className="input-field pr-11 text-sm"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              />
            </div>

            {/* Birth Date (Manual Input) */}
            <div className="relative">
              <Calendar className="absolute right-3 top-3 text-orbitPurple" size={18} />
              <input 
                type="text" 
                placeholder="تاريخ الميلاد (DD/MM/YYYY)"
                className="input-field pr-11 text-sm"
                value={profileData.birthDate}
                onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                dir="ltr"
              />
            </div>

            {/* Gender */}
            <div className="flex gap-3">
              <button
                onClick={() => setProfileData({ ...profileData, gender: 'male' })}
                className={`flex-1 py-3 rounded-xl border transition-all ${
                  profileData.gender === 'male' 
                    ? 'bg-orbitCyan text-black border-orbitCyan font-bold' 
                    : 'bg-black/40 border-white/20 text-gray-400'
                }`}
              >
                ذكر
              </button>
              <button
                onClick={() => setProfileData({ ...profileData, gender: 'female' })}
                className={`flex-1 py-3 rounded-xl border transition-all ${
                  profileData.gender === 'female' 
                    ? 'bg-orbitPink text-white border-orbitPink font-bold' 
                    : 'bg-black/40 border-white/20 text-gray-400'
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
              <MapPin className="absolute right-3 top-3 text-orbitCyan" size={18} />
              <input 
                type="text" 
                placeholder="الموقع (اختياري)"
                className="input-field pr-11 text-sm"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute right-3 top-3 text-orbitPurple" size={18} />
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
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 mt-6"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5"></div>
                  <span>جاري الإنشاء...</span>
                </div>
              ) : (
                'إنشاء الحساب'
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 245, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 245, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
