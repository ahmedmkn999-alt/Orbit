import React, { useState, useRef, useEffect } from 'react';
import { Smartphone, ShieldCheck, User, Calendar, Camera, Users, MapPin, Mail, ArrowRight, Copy, Check, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadToCloudinary } from '../services/cloudinary';

export default function AdvancedAuthScreen() {
  const { requestOTP, verifyOTP, loginWithPassword, forgotPassword, resetPassword } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState(1); // 1: phone, 2: login method, 3: otp/password, 4: profile setup, 5: forgot password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [sentToTelegram, setSentToTelegram] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' or 'password'
  
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
  const fileInputRef = useRef(null);

  // Step 1: Request OTP - يتولد محلياً ويظهر على الشاشة
  const handleRequestOTP = async () => {
    const cleaned = phoneNumber.replace(/\s/g, '');
    if (cleaned.length < 10) {
      showToast('رقم الهاتف غير صحيح. يجب أن يكون 10 أرقام على الأقل');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // توليد كود عشوائي 6 أرقام
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(newOTP);
    setLoginMethod('otp');
    setLoading(false);
    setStep(3);
  };

  // Step 2: Login with Password (for existing users)
  const handlePasswordLogin = async () => {
    if (!password) {
      showToast('كلمة المرور مطلوبة');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await loginWithPassword(phoneNumber, password);
    
    if (result.success) {
      window.location.href = '/home';
    } else {
      showToast(result.message);
    }
    
    setLoading(false);
  };

  // Step 3: Verify OTP
  const handleVerifyOTP = async () => {
    const cleanedOtp = otp.replace(/\s/g, '');
    if (cleanedOtp.length !== 6) {
      showToast('كود التأكيد يجب أن يكون 6 أرقام');
      return;
    }

    // التحقق من الكود المولّد محلياً
    if (cleanedOtp !== generatedOTP) {
      showToast('الكود غير صحيح. تأكد من الكود المعروض على الشاشة');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOTP(phoneNumber, cleanedOtp, password, isNewUser, profileData);

    if (result.success) {
      if (result.isNewUser) {
        setIsNewUser(true);
        setStep(4);
      } else {
        window.location.href = '/home';
      }
    } else {
      // مستخدم جديد - روح لإعداد البروفايل
      setIsNewUser(true);
      setStep(4);
    }

    setLoading(false);
  };

  // Step 4: Complete Profile (for new users)
  const handleProfileComplete = async () => {
    if (!profileData.name.trim()) {
      showToast('الرجاء إدخال الاسم الكامل');
      return;
    }
    if (!profileData.birthDate) {
      showToast('الرجاء إدخال تاريخ الميلاد');
      return;
    }
    if (!profileData.gender) {
      showToast('الرجاء اختيار الجنس');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Upload profile picture if exists
      let profilePictureUrl = null;
      if (profileData.profilePicture) {
        const uploadResult = await uploadToCloudinary(
          profileData.profilePicture,
          'orbit/profile-pictures'
        );
        if (uploadResult.success) {
          profilePictureUrl = uploadResult.url;
        }
      }
      
      // Create user profile with password
      const result = await verifyOTP(
        phoneNumber, 
        otp, 
        password, 
        true, 
        {
          name: profileData.name.trim(),
          phoneNumber,
          birthDate: profileData.birthDate,
          gender: profileData.gender,
          bio: profileData.bio.trim(),
          location: profileData.location.trim(),
          email: profileData.email.trim(),
          profilePicture: profilePictureUrl
        }
      );
      
      if (result.success) {
        window.location.href = '/home';
      } else {
        showToast(result.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch (err) {
      showToast(err.message);
    }
    
    setLoading(false);
  };

  // Forgot Password Flow
  const handleForgotPassword = async () => {
    const cleaned = phoneNumber.replace(/\s/g, '');
    if (cleaned.length < 10) {
      showToast('رقم الهاتف غير صحيح');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await forgotPassword(cleaned);
    
    if (result.success) {
      setStep(5); // Go to reset password step
    } else {
      showToast(result.message);
    }
    
    setLoading(false);
  };

  const handleResetPassword = async () => {
    const cleanedOtp = otp.replace(/\s/g, '');
    if (cleanedOtp.length !== 6) {
      showToast('كود التأكيد يجب أن يكون 6 أرقام');
      return;
    }
    
    if (!password || password.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      showToast('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await resetPassword(phoneNumber, cleanedOtp, password);
    
    if (result.success) {
      setError('');
      setStep(1);
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      alert('✅ تم تغيير كلمة المرور بنجاح! يمكنك تسجيل الدخول الآن');
    } else {
      showToast(result.message);
    }
    
    setLoading(false);
  };

  // Copy OTP to clipboard
  const copyOTP = () => {
    navigator.clipboard.writeText(generatedOTP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('يرجى اختيار صورة صحيحة');
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
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-orbitCyan/30 shadow-neonCyan">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gradient mb-2 animate-glow">ORBIT</h1>
          <p className="text-gray-400">{t('auth.welcome')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${
              s <= step ? 'w-8 bg-orbitCyan' : 'w-4 bg-white/10'
            }`} />
          ))}
        </div>

        {/* Toast Notification - ينزل من فوق */}
        <div className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ${toastVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="mt-4 mx-4 bg-red-500/90 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-lg text-sm text-right max-w-sm w-full">
            {toast}
          </div>
        </div>

        {/* Step 1: Phone Number */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-400 mb-3 text-right">أدخل رقم هاتفك</p>
              <div className="relative">
                <Smartphone className="absolute right-3 top-3.5 text-orbitCyan" size={20} />
                <input 
                  type="tel" 
                  placeholder="01XXXXXXXXX"
                  className="input-field pr-12 text-left tracking-wider"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleRequestOTP)}
                  dir="ltr"
                  autoComplete="tel"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2 text-right">مثال: 01001234567</p>
            </div>
            
            <button 
              onClick={handleRequestOTP}
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
            <div id="recaptcha-container"></div>
          </div>
        )}

        {/* Step 2: Login Method Choice (Existing Users Only) */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400 text-right mb-4">
              اختر طريقة تسجيل الدخول
            </p>

            {/* OTP Display Box */}
            {generatedOTP && (
              <div className="bg-orbitCyan/10 border border-orbitCyan/30 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-400 text-right mb-2">كود التحقق الخاص بك:</p>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={copyOTP}
                    className="flex items-center gap-2 px-3 py-2 bg-orbitCyan/20 hover:bg-orbitCyan/30 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-orbitCyan" />}
                    <span className="text-xs text-gray-300">{copied ? 'تم النسخ!' : 'نسخ'}</span>
                  </button>
                  <div className="text-2xl font-bold text-orbitCyan tracking-[0.5em] font-mono">
                    {generatedOTP}
                  </div>
                </div>
                {sentToTelegram && (
                  <p className="text-xs text-green-400 text-right mt-2">
                    ✅ تم إرسال الكود أيضاً إلى بوت التيليجرام
                  </p>
                )}
              </div>
            )}

            {/* Login Method Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setLoginMethod('otp'); setStep(3); }}
                className="flex flex-col items-center gap-2 p-4 bg-orbitCyan/10 hover:bg-orbitCyan/20 border border-orbitCyan/30 rounded-xl transition-all"
              >
                <ShieldCheck size={32} className="text-orbitCyan" />
                <span className="text-sm font-medium">كود OTP</span>
              </button>
              
              <button
                onClick={() => { setLoginMethod('password'); setStep(3); }}
                className="flex flex-col items-center gap-2 p-4 bg-orbitPurple/10 hover:bg-orbitPurple/20 border border-orbitPurple/30 rounded-xl transition-all"
              >
                <Lock size={32} className="text-orbitPurple" />
                <span className="text-sm font-medium">كلمة المرور</span>
              </button>
            </div>

            <button 
              onClick={() => { setStep(1); setOtp(''); setPassword(''); setError(''); }}
              className="w-full text-center text-sm text-gray-400 hover:text-orbitCyan transition-colors flex items-center justify-center gap-1"
            >
              <ArrowRight size={14} /> تغيير رقم الهاتف
            </button>
          </div>
        )}

        {/* Step 3: OTP or Password Verification */}
        {step === 3 && (
          <div className="space-y-6">
            {/* OTP Display */}
            {generatedOTP && (
              <div className="bg-orbitCyan/10 border border-orbitCyan/30 rounded-xl p-4">
                <p className="text-xs text-gray-400 text-right mb-2">كود التحقق الخاص بك:</p>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={copyOTP}
                    className="flex items-center gap-2 px-3 py-2 bg-orbitCyan/20 hover:bg-orbitCyan/30 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-orbitCyan" />}
                    <span className="text-xs text-gray-300">{copied ? 'تم النسخ!' : 'نسخ'}</span>
                  </button>
                  <div className="text-2xl font-bold text-orbitCyan tracking-[0.5em] font-mono">
                    {generatedOTP}
                  </div>
                </div>
                {sentToTelegram && (
                  <p className="text-xs text-green-400 text-right mt-2">
                    ✅ تم إرسال الكود أيضاً إلى بوت التيليجرام
                  </p>
                )}
              </div>
            )}

            {loginMethod === 'otp' ? (
              <>
                {/* OTP Input */}
                <div>
                  <p className="text-sm text-gray-400 mb-3 text-right">
                    أدخل كود التحقق
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
                      maxLength={6}
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password fields for new users */}
                {isNewUser && (
                  <>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3.5 text-orbitCyan" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="كلمة المرور *"
                        className="input-field pr-11 pl-11 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3.5 text-gray-400 hover:text-orbitCyan transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="relative">
                      <Lock className="absolute right-3 top-3.5 text-orbitPurple" size={18} />
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="تأكيد كلمة المرور *"
                        className="input-field pr-11 pl-11 text-sm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-3.5 text-gray-400 hover:text-orbitCyan transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-right">كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
                  </>
                )}
                
                <button 
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 6 || (isNewUser && (!password || !confirmPassword))}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="spinner w-5 h-5"></div>
                      <span>جاري التحقق...</span>
                    </div>
                  ) : (
                    isNewUser ? 'التالي' : t('auth.login')
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Password Login */}
                <div className="relative">
                  <Lock className="absolute right-3 top-3.5 text-orbitCyan" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="كلمة المرور"
                    className="input-field pr-11 pl-11 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handlePasswordLogin)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3.5 text-gray-400 hover:text-orbitCyan transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                <button 
                  onClick={handlePasswordLogin}
                  disabled={loading || !password}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="spinner w-5 h-5"></div>
                      <span>جاري تسجيل الدخول...</span>
                    </div>
                  ) : (
                    t('auth.login')
                  )}
                </button>

                <button 
                  onClick={() => { setStep(1); setPassword(''); setError(''); }}
                  className="w-full text-center text-sm text-gray-400 hover:text-orbitCyan transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowRight size={14} /> تغيير رقم الهاتف
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
