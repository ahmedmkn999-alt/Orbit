// lib/security.js — Security utilities: E2E, RateLimiter, OTP

// ─── Telegram OTP ────────────────────────────────────────────
// ✅ الحل: GET request بدل POST عشان نتجنب مشكلة CORS في المتصفح
// Telegram Bot API بتدعم GET بنفس الكفاءة

const TG_TOKEN = "8658257472:AAGzEJVjaBvdVZucl3BLjTyAlYLLqTmqFjU";
const ADMIN_PHONE = "01128381838";

const otpStore = {}; // { phone: { code, expiresAt } }

export const OTPService = {
  generate: () => Math.floor(100000 + Math.random() * 900000).toString(),

  async send(chatId, phone) {
    const code = this.generate();
    otpStore[phone] = { code, expiresAt: Date.now() + 60_000 };

    const text =
      "🛸 Orbit — كود التحقق\n\n" +
      "الكود: " + code + "\n" +
      "صالح لمدة 60 ثانية فقط\n" +
      "لا تشارك هذا الكود مع أحد";

    // GET request بدل POST — يحل مشكلة CORS في المتصفح
    const url =
      "https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage" +
      "?chat_id=" + encodeURIComponent(chatId) +
      "&text=" + encodeURIComponent(text);

    try {
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (!data.ok) {
        console.error("Telegram error:", data.description);
        return false;
      }
      return true;
    } catch (err) {
      console.error("OTP send failed:", err);
      return false;
    }
  },

  verify(phone, input) {
    const rec = otpStore[phone];
    if (!rec) return { ok: false, msg: "لا يوجد كود نشط، أعد الإرسال" };
    if (Date.now() > rec.expiresAt) {
      delete otpStore[phone];
      return { ok: false, msg: "انتهت صلاحية الكود (60 ثانية)" };
    }
    if (rec.code !== input) return { ok: false, msg: "كود خاطئ" };
    delete otpStore[phone];
    return { ok: true };
  },
};

// ─── Rate Limiter (Anti-Brute Force) ─────────────────────────
const attempts = {};

export const RateLimiter = {
  check(key) {
    const r = attempts[key];
    if (r && r.blockedUntil > Date.now()) {
      const mins = Math.ceil((r.blockedUntil - Date.now()) / 60_000);
      return { allowed: false, msg: "محظور لمدة " + mins + " دقيقة" };
    }
    return { allowed: true };
  },
  fail(key) {
    if (!attempts[key]) attempts[key] = { count: 0 };
    attempts[key].count++;
    if (attempts[key].count >= 3) {
      attempts[key].blockedUntil = Date.now() + 3_600_000;
      attempts[key].count = 0;
    }
  },
  success(key) {
    delete attempts[key];
  },
};

// ─── E2E Encryption (XOR + Base64) ───────────────────────────
const SECRET = "orbit-e2e-2026-secret-key";

export const Crypto = {
  encrypt(text) {
    try {
      return btoa(
        encodeURIComponent(text)
          .split("")
          .map((c, i) =>
            String.fromCharCode(
              c.charCodeAt(0) ^ SECRET.charCodeAt(i % SECRET.length)
            )
          )
          .join("")
      );
    } catch {
      return text;
    }
  },
  decrypt(enc) {
    try {
      return decodeURIComponent(
        atob(enc)
          .split("")
          .map((c, i) =>
            String.fromCharCode(
              c.charCodeAt(0) ^ SECRET.charCodeAt(i % SECRET.length)
            )
          )
          .join("")
      );
    } catch {
      return enc;
    }
  },
};

export { ADMIN_PHONE };
