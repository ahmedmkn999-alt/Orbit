// Telegram Bot Service - @OrbitOTP_bot
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * إرسال رسالة عبر بوت تيليجرام
 * @param {string} chatId - معرف المحادثة
 * @param {string} message - نص الرسالة
 */
export const sendTelegramMessage = async (chatId, message) => {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return { success: true, data };
  } catch (error) {
    console.error('Telegram send error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * إرسال إشعار OTP عبر تيليجرام (اختياري - كـ backup)
 * @param {string} chatId 
 * @param {string} otp 
 */
export const sendOTPViaTelegram = async (chatId, otp) => {
  const message = `
🔐 <b>ORBIT - كود التحقق</b>

كودك هو: <code>${otp}</code>

⏰ صالح لمدة 5 دقائق فقط
🚫 لا تشاركه مع أي أحد

@OrbitOTP_bot
  `.trim();

  return sendTelegramMessage(chatId, message);
};

/**
 * إرسال إشعار تسجيل دخول مشبوه
 */
export const sendSecurityAlert = async (chatId, details) => {
  const message = `
⚠️ <b>تنبيه أمني - ORBIT</b>

تم تسجيل دخول جديد لحسابك:
📱 الجهاز: ${details.device || 'غير معروف'}
🌍 الموقع: ${details.location || 'غير معروف'}
🕐 الوقت: ${new Date().toLocaleString('ar-EG')}

إذا لم تكن أنت، قم بتغيير كلمة المرور فوراً.
  `.trim();

  return sendTelegramMessage(chatId, message);
};
