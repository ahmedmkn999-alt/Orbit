import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin SDK Setup
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Telegram Bot Setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// In-memory storage for OTPs (in production, use Redis)
const otpStore = new Map(); // { phoneNumber: { otp, expiresAt, chatId } }
const chatIdStore = new Map(); // { phoneNumber: chatId }

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Telegram Bot: Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;
  
  await bot.sendMessage(chatId, 
    `🚀 أهلاً بك في ORBIT!\n\n` +
    `لربط حسابك، اكتب رقم هاتفك:\n` +
    `مثال: 01001234567\n\n` +
    `بعد كده هتقدر تستقبل أكواد التحقق هنا 🔐`
  );
});

// Telegram Bot: Handle phone number registration
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Ignore commands
  if (text?.startsWith('/')) return;
  
  // Check if it's a phone number
  const phoneRegex = /^(01|20)[0-9]{9,10}$/;
  if (phoneRegex.test(text.replace(/\s/g, ''))) {
    let phone = text.replace(/\s/g, '');
    
    // Normalize phone number
    if (phone.startsWith('01')) {
      phone = '20' + phone.substring(1);
    } else if (!phone.startsWith('20')) {
      phone = '20' + phone;
    }
    
    // Store chatId for this phone number
    chatIdStore.set(phone, chatId);
    
    await bot.sendMessage(chatId, 
      `✅ تم ربط الرقم: ${phone}\n\n` +
      `دلوقتي تقدر تستقبل أكواد التحقق على هذا الحساب 🔐`
    );
  }
});

// API: Request OTP
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }
    
    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('01')) {
      normalizedPhone = '20' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('20')) {
      normalizedPhone = '20' + normalizedPhone;
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    // Store OTP
    otpStore.set(normalizedPhone, { otp, expiresAt });
    
    // Send via Telegram if chatId exists
    const chatId = chatIdStore.get(normalizedPhone);
    let sentToTelegram = false;
    
    if (chatId) {
      try {
        await bot.sendMessage(chatId, 
          `🔐 <b>كود التحقق - ORBIT</b>\n\n` +
          `كودك هو: <code>${otp}</code>\n\n` +
          `⏰ صالح لمدة 5 دقائق فقط\n` +
          `🚫 لا تشاركه مع أي أحد`,
          { parse_mode: 'HTML' }
        );
        sentToTelegram = true;
      } catch (err) {
        console.error('Error sending to Telegram:', err);
      }
    }
    
    // Check if user exists
    const userDoc = await db.collection('users').doc(normalizedPhone).get();
    const isNewUser = !userDoc.exists();
    
    res.json({ 
      success: true, 
      otp, // Send OTP in response for in-app display
      isNewUser,
      sentToTelegram,
      message: 'تم إنشاء الكود بنجاح'
    });
    
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// API: Verify OTP and Login/Register
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, password, isNewUser, profileData } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
    }
    
    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('01')) {
      normalizedPhone = '20' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('20')) {
      normalizedPhone = '20' + normalizedPhone;
    }
    
    // Check OTP
    const storedOTP = otpStore.get(normalizedPhone);
    
    if (!storedOTP) {
      return res.status(400).json({ success: false, message: 'لم يتم طلب كود. اطلب كود جديد' });
    }
    
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ success: false, message: 'انتهت صلاحية الكود. اطلب كود جديد' });
    }
    
    if (storedOTP.otp !== otp) {
      return res.status(400).json({ success: false, message: 'الكود غير صحيح' });
    }
    
    // OTP is valid, clear it
    otpStore.delete(normalizedPhone);
    
    const userRef = db.collection('users').doc(normalizedPhone);
    const userDoc = await userRef.get();
    
    if (isNewUser) {
      // Create new user
      if (!password) {
        return res.status(400).json({ success: false, message: 'كلمة المرور مطلوبة للتسجيل' });
      }
      
      // Hash password
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      const userData = {
        phoneNumber: normalizedPhone,
        passwordHash,
        ...profileData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        isOnline: true,
        accountStatus: 'active',
        role: 'user',
        verified: true,
        friends: [],
        settings: {
          language: 'ar',
          theme: 'dark',
          notifications: true,
          privacy: {
            showOnlineStatus: true,
            showLastSeen: true,
            allowMessages: 'everyone'
          }
        }
      };
      
      await userRef.set(userData);
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await userRef.update({ sessionToken });
      
      res.json({ 
        success: true, 
        isNewUser: true,
        user: { ...userData, uid: normalizedPhone },
        sessionToken,
        message: 'تم إنشاء الحساب بنجاح' 
      });
      
    } else {
      // Existing user - login
      const userData = userDoc.data();
      
      // Update last active
      await userRef.update({
        isOnline: true,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Generate new session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await userRef.update({ sessionToken });
      
      res.json({ 
        success: true, 
        isNewUser: false,
        user: { ...userData, uid: normalizedPhone },
        sessionToken,
        message: 'تم تسجيل الدخول بنجاح' 
      });
    }
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// API: Login with Password
app.post('/api/auth/login-password', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    if (!phoneNumber || !password) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
    }
    
    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('01')) {
      normalizedPhone = '20' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('20')) {
      normalizedPhone = '20' + normalizedPhone;
    }
    
    const userRef = db.collection('users').doc(normalizedPhone);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    const userData = userDoc.data();
    
    // Check password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    if (userData.passwordHash !== passwordHash) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }
    
    // Update last active
    await userRef.update({
      isOnline: true,
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Generate new session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await userRef.update({ sessionToken });
    
    res.json({ 
      success: true, 
      user: { ...userData, uid: normalizedPhone },
      sessionToken,
      message: 'تم تسجيل الدخول بنجاح' 
    });
    
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// API: Forgot Password (Request OTP via Telegram)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }
    
    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('01')) {
      normalizedPhone = '20' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('20')) {
      normalizedPhone = '20' + normalizedPhone;
    }
    
    // Check if user exists
    const userDoc = await db.collection('users').doc(normalizedPhone).get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (5 * 60 * 1000);
    
    // Store OTP
    otpStore.set(normalizedPhone, { otp, expiresAt });
    
    // Send via Telegram
    const chatId = chatIdStore.get(normalizedPhone);
    
    if (!chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'لم يتم ربط حسابك ببوت التيليجرام. اضغط /start في البوت وأرسل رقمك' 
      });
    }
    
    try {
      await bot.sendMessage(chatId, 
        `🔐 <b>استعادة كلمة المرور - ORBIT</b>\n\n` +
        `كود الاستعادة: <code>${otp}</code>\n\n` +
        `⏰ صالح لمدة 5 دقائق فقط\n` +
        `🚫 لا تشاركه مع أي أحد`,
        { parse_mode: 'HTML' }
      );
      
      res.json({ 
        success: true, 
        message: 'تم إرسال الكود إلى بوت التيليجرام' 
      });
    } catch (err) {
      console.error('Error sending to Telegram:', err);
      res.status(500).json({ success: false, message: 'فشل إرسال الكود عبر التيليجرام' });
    }
    
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// API: Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;
    
    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
    }
    
    // Normalize phone number
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('01')) {
      normalizedPhone = '20' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('20')) {
      normalizedPhone = '20' + normalizedPhone;
    }
    
    // Check OTP
    const storedOTP = otpStore.get(normalizedPhone);
    
    if (!storedOTP) {
      return res.status(400).json({ success: false, message: 'لم يتم طلب كود. اطلب كود جديد' });
    }
    
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(normalizedPhone);
      return res.status(400).json({ success: false, message: 'انتهت صلاحية الكود' });
    }
    
    if (storedOTP.otp !== otp) {
      return res.status(400).json({ success: false, message: 'الكود غير صحيح' });
    }
    
    // OTP is valid, clear it
    otpStore.delete(normalizedPhone);
    
    // Update password
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    await db.collection('users').doc(normalizedPhone).update({
      passwordHash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'تم تغيير كلمة المرور بنجاح' 
    });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// API: Verify Session Token
app.post('/api/auth/verify-session', async (req, res) => {
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }
    
    // Find user with this session token
    const usersSnapshot = await db.collection('users')
      .where('sessionToken', '==', sessionToken)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    
    // Update last active
    await userDoc.ref.update({
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      user: { ...userData, uid: userDoc.id }
    });
    
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Telegram bot is active`);
});
