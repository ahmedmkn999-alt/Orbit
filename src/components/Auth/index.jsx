// components/Auth/index.jsx — شاشة تسجيل الدخول بـ OTP Telegram

import { useState, useEffect } from "react";
import { signInAnonymously, updateProfile } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { OTPService, RateLimiter, ADMIN_PHONE } from "../../lib/security";
import { saveUserProfile } from "../../hooks/useAuth";
import { T, Input, Button, GlassCard, ErrorMsg, GlobalCSS } from "../Shared";

const STEPS = { PHONE: "phone", OTP: "otp" };

export default function AuthScreen() {
  const [step, setStep]     = useState(STEPS.PHONE);
  const [phone, setPhone]   = useState("");
  const [chatId, setChatId] = useState("");
  const [name, setName]     = useState("");
  const [otp, setOtp]       = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // عداد تنازلي 60s
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phone.trim() || !chatId.trim())
      return setError("أدخل رقم الهاتف وـ Chat ID");

    // تحقق إن الـ Chat ID أرقام فقط
    if (!/^\d+$/.test(chatId.trim()))
      return setError("الـ Chat ID يجب أن يكون أرقام فقط مثل: 123456789");

    setError("");
    setLoading(true);

    const ok = await OTPService.send(chatId.trim(), phone.trim());
    setLoading(false);

    if (ok) {
      setStep(STEPS.OTP);
      setCountdown(60);
    } else {
      setError(
        "❌ فشل إرسال الكود — تأكد من الآتي:\n" +
        "1. عملت /start للبوت على Telegram\n" +
        "2. الـ Chat ID صح (احصل عليه من @userinfobot)\n" +
        "3. البوت مش محظور عندك"
      );
    }
  };

  const handleVerifyOTP = async () => {
    // فحص Rate Limiter
    const limCheck = RateLimiter.check(phone);
    if (!limCheck.allowed) return setError(limCheck.msg);

    const result = OTPService.verify(phone.trim(), otp.trim());
    if (!result.ok) {
      RateLimiter.fail(phone);
      return setError(result.msg);
    }

    RateLimiter.success(phone);
    setLoading(true);
    try {
      const { user: fbUser } = await signInAnonymously(auth);
      const displayName = name || ("مستخدم_" + phone.slice(-4));
      await updateProfile(fbUser, { displayName });
      await saveUserProfile(fbUser.uid, {
        uid: fbUser.uid,
        name: displayName,
        phone: phone.trim(),
        verified: false,
        createdAt: new Date(),
      });
    } catch (e) {
      setError("خطأ في تسجيل الدخول: " + e.message);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{GlobalCSS}</style>
      <div style={{
        minHeight: "100vh", background: T.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: T.font,
      }}>
        {/* خلفية نيون */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(0,245,255,0.07) 0%, transparent 55%), " +
            "radial-gradient(ellipse at 80% 80%, rgba(123,47,255,0.07) 0%, transparent 55%)",
        }} />

        <GlassCard style={{ width: "100%", maxWidth: 420, padding: 32, animation: "fadeIn 0.4s ease" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 52, filter: "drop-shadow(0 0 20px " + T.cyan + ")", marginBottom: 8 }}>🌐</div>
            <h1 style={{
              margin: 0, color: T.cyan, fontSize: 32, fontWeight: 900,
              letterSpacing: 4, textShadow: T.cyanGlow,
            }}>ORBIT</h1>
            <p style={{ color: T.textMuted, fontSize: 13, margin: "6px 0 0" }}>
              اتصل بالعالم · Connect to the Universe
            </p>
          </div>

          {/* ─── Step: Phone ─── */}
          {step === STEPS.PHONE && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <label style={{ color: T.textMuted, fontSize: 13 }}>📱 رقم الهاتف</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01128381838"
                type="tel"
              />

              <label style={{ color: T.textMuted, fontSize: 13 }}>
                🤖 Telegram Chat ID
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: T.cyan, fontSize: 11, marginRight: 8, textDecoration: "none" }}
                >
                  ← احصل عليه هنا
                </a>
              </label>
              <Input
                value={chatId}
                onChange={(e) => setChatId(e.target.value.replace(/\D/g, ""))}
                placeholder="123456789"
                type="tel"
              />

              <label style={{ color: T.textMuted, fontSize: 13 }}>👤 اسمك (اختياري)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك في Orbit"
              />

              {/* تعليمات الـ Chat ID */}
              <div style={{
                background: "rgba(0,245,255,0.06)",
                border: "1px solid rgba(0,245,255,0.15)",
                borderRadius: 10, padding: "10px 14px",
                fontSize: 12, color: T.textMuted, lineHeight: 1.8,
              }}>
                <strong style={{ color: T.cyan }}>كيف تعرف الـ Chat ID؟</strong><br />
                1. افتح Telegram وابحث عن <strong style={{ color: T.textPrimary }}>@userinfobot</strong><br />
                2. ابعتله أي رسالة<br />
                3. هيرد عليك بالـ <strong style={{ color: T.textPrimary }}>Id</strong> بتاعك<br />
                4. انسخه والصقه هنا
              </div>

              <ErrorMsg text={error} />

              <Button
                onClick={handleSendOTP}
                disabled={loading || !phone || !chatId}
                full
              >
                {loading ? "⏳ جاري الإرسال..." : "📲 إرسال كود التحقق عبر Telegram"}
              </Button>
            </div>
          )}

          {/* ─── Step: OTP ─── */}
          {step === STEPS.OTP && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div style={{
                textAlign: "center", padding: 16,
                background: T.cyanDim, borderRadius: T.radius,
                border: "1px solid " + T.border,
              }}>
                <p style={{ color: T.cyan, margin: 0, fontSize: 14 }}>
                  📨 تم إرسال الكود على Telegram
                </p>
                <div style={{
                  fontSize: 40, fontWeight: 900, marginTop: 8,
                  color: countdown > 10 ? T.cyan : T.pink,
                  textShadow: countdown > 10 ? T.cyanGlow : "0 0 20px rgba(255,45,120,0.5)",
                }}>
                  {countdown > 0 ? (countdown + "s") : "❌ انتهى"}
                </div>
              </div>

              <label style={{ color: T.textMuted, fontSize: 13 }}>🔐 كود التحقق (6 أرقام)</label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                style={{ textAlign: "center", fontSize: 28, letterSpacing: 12, fontWeight: 800 }}
                maxLength={6}
              />

              <ErrorMsg text={error} />

              <Button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || countdown === 0 || loading}
                full
              >
                {loading ? "⏳ جاري التحقق..." : "✅ دخول Orbit"}
              </Button>

              {countdown === 0 && (
                <Button variant="ghost" onClick={handleSendOTP} full>
                  🔄 إعادة إرسال الكود
                </Button>
              )}

              <button
                onClick={() => { setStep(STEPS.PHONE); setOtp(""); setError(""); }}
                style={{
                  background: "none", border: "none",
                  color: T.textMuted, cursor: "pointer",
                  fontSize: 13, fontFamily: T.font,
                }}
              >
                ← تغيير رقم الهاتف أو Chat ID
              </button>
            </div>
          )}

        </GlassCard>
      </div>
    </>
  );
}
